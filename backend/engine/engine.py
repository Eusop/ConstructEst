#!/usr/bin/env python
"""
Entry point invoked by the Node backend (see src/services/engine.service.js)
as a child process. Reads one JSON object from stdin:

  {
    "dxfPath": "C:/.../uploads/169...-plan.dxf",
    "secondFloorDxfPath": "C:/.../uploads/169...-second-floor.dxf",  # optional, 2-storey only
    "storeys": 1,
    "includeRoofing": true,
    "constants": { "cementFactor": 1.08, "steelFactor": 1.05,
                    "roofingFactor": 1.07, "wastagePercent": 5 },
    "overrides": { "buildingHeight": 6.0, "floorToFloorHeight": 3.0, ... }
  }

Writes one JSON object to stdout: either
  { "measurements": {...}, "materials": [...] }
or, on failure:
  { "error": "human-readable message" }
with a non-zero exit code.
"""
import hashlib
import json
import sys

import ezdxf
from ezdxf import DXFStructureError

from dxf_reader import extract_geometry
from formulas import compute_materials


def fail(message):
    print(json.dumps({"error": message}))
    sys.exit(1)


def _file_hash(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def read_and_validate(dxf_path, label):
    """Reads one DXF file and validates its geometry. `label` names the file in
    error messages (e.g. "second floor DXF")."""
    try:
        doc = ezdxf.readfile(dxf_path)
    except (OSError, DXFStructureError, ezdxf.DXFError) as exc:
        fail(f"Could not read {label}: {exc}")

    geometry = extract_geometry(doc)

    if geometry["floor_area_m2"] <= 0:
        fail(f"No floor boundary found on the FLOOR layer of the {label}. Check that the "
             "DXF uses the expected layer names (WALL, DOOR, WINDOW, "
             "COLUMN, STAIR, ROOF, FLOOR) and that room outlines are "
             "closed polylines.")

    # A wrong wall layer name (e.g. "A-WALL") would give 0 wall length and drop
    # CHB, wall cement/sand and wall rebar without any error, so fail here.
    if geometry["wall_length_m"] <= 0:
        fail(f"No wall entities found on a WALL layer of the {label}. Check that the "
             "DXF uses the expected layer name (WALL, or an alias like "
             "WALLS) for wall lines/polylines.")

    return geometry


def main():
    raw_input = sys.stdin.read()
    try:
        payload = json.loads(raw_input)
    except json.JSONDecodeError as exc:
        fail(f"Invalid engine request: {exc}")

    if not isinstance(payload, dict):
        fail("Invalid engine request: expected a JSON object.")

    dxf_path = payload.get("dxfPath")
    if not dxf_path:
        fail("Invalid engine request: dxfPath is required.")

    try:
        storeys_raw = payload.get("storeys", 1)
        int(storeys_raw)
    except (TypeError, ValueError):
        fail(f"Invalid engine request: storeys must be a number, got {storeys_raw!r}.")
    second_floor_dxf_path = payload.get("secondFloorDxfPath")
    storeys = int(payload.get("storeys", 1))
    include_roofing = bool(payload.get("includeRoofing", True))
    constants = payload.get("constants") or {}
    overrides = payload.get("overrides") or {}

    # The same file in both slots would count up to 4 floors while storeys says 2.
    # Two different floors are never byte-identical, so reject it.
    if second_floor_dxf_path and _file_hash(dxf_path) == _file_hash(second_floor_dxf_path):
        fail("The same file was uploaded for both the ground floor and second floor. Each "
             "floor needs its own DXF file. Re-upload the second floor as its own file, "
             "or choose 1 storey.")

    geometry = read_and_validate(dxf_path, "DXF file")
    geometry2 = read_and_validate(second_floor_dxf_path, "second floor DXF") if second_floor_dxf_path else None

    result = compute_materials(geometry, storeys, include_roofing, constants, overrides, geometry2=geometry2)
    print(json.dumps(result))


if __name__ == "__main__":
    # Catch-all so every exit path prints one JSON object. Without it, an
    # unexpected error (bad vertex, degenerate polygon) leaves stdout empty and
    # engine.service.js reports "invalid output" with no real reason.
    try:
        main()
    except SystemExit:
        raise  # fail() already printed its JSON
    except Exception as exc:  # noqa: BLE001 - deliberately catch-all, see above
        fail(f"Engine failed while processing the DXF: {type(exc).__name__}: {exc}")

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
import json
import sys

import ezdxf
from ezdxf import DXFStructureError

from dxf_reader import extract_geometry
from formulas import compute_materials


def fail(message):
    print(json.dumps({"error": message}))
    sys.exit(1)


def read_and_validate(dxf_path, label):
    """Reads one DXF file and extracts+validates its geometry. `label` names
    which file this is in any error message (e.g. "second floor DXF") so a
    failure on the second file doesn't read like it came from the first."""
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

    # Without this, a mismatched wall layer name (e.g. "A-WALL") silently
    # computes wall_length_m as 0 — CHB, wall cement/sand, and wall rebar
    # all quietly drop out while every other material still looks normal,
    # so the take-off renders as if it succeeded. Fail loudly instead,
    # same as the FLOOR check above.
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

    dxf_path = payload.get("dxfPath")
    second_floor_dxf_path = payload.get("secondFloorDxfPath")
    storeys = int(payload.get("storeys", 1))
    include_roofing = bool(payload.get("includeRoofing", True))
    constants = payload.get("constants") or {}
    overrides = payload.get("overrides") or {}

    geometry = read_and_validate(dxf_path, "DXF file")
    geometry2 = read_and_validate(second_floor_dxf_path, "second floor DXF") if second_floor_dxf_path else None

    result = compute_materials(geometry, storeys, include_roofing, constants, overrides, geometry2=geometry2)
    print(json.dumps(result))


if __name__ == "__main__":
    main()

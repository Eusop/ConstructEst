#!/usr/bin/env python
"""
Entry point invoked by the Node backend (see src/services/engine.service.js)
as a child process. Reads one JSON object from stdin:

  {
    "dxfPath": "C:/.../uploads/169...-plan.dxf",
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


def main():
    raw_input = sys.stdin.read()
    try:
        payload = json.loads(raw_input)
    except json.JSONDecodeError as exc:
        print(json.dumps({"error": f"Invalid engine request: {exc}"}))
        sys.exit(1)

    dxf_path = payload.get("dxfPath")
    storeys = int(payload.get("storeys", 1))
    include_roofing = bool(payload.get("includeRoofing", True))
    constants = payload.get("constants") or {}
    overrides = payload.get("overrides") or {}

    try:
        doc = ezdxf.readfile(dxf_path)
    except (OSError, DXFStructureError, ezdxf.DXFError) as exc:
        print(json.dumps({"error": f"Could not read DXF file: {exc}"}))
        sys.exit(1)

    geometry = extract_geometry(doc)

    if geometry["floor_area_m2"] <= 0:
        print(json.dumps({
            "error": "No floor boundary found on the FLOOR layer. Check that the "
                     "DXF uses the expected layer names (WALL, DOOR, WINDOW, "
                     "COLUMN, STAIR, ROOF, FLOOR) and that room outlines are "
                     "closed polylines.",
        }))
        sys.exit(1)

    result = compute_materials(geometry, storeys, include_roofing, constants, overrides)
    print(json.dumps(result))


if __name__ == "__main__":
    main()

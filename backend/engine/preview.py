#!/usr/bin/env python
"""
Floor plan preview for Explore Projects (see src/services/engine.service.js).
Reads {"dxfPath": "..."} from stdin and writes {"shapes": [...], "bounds": {...}}
or {"error": "..."}. Only lines, polylines, MLINE walls, circles and arcs are
kept, never text, so a shared preview can't show a title block or a name.
Same shape format as the frontend's dxfParserService.js.
"""
import json
import math
import sys

import ezdxf
from ezdxf import DXFStructureError


def fail(message):
    print(json.dumps({"error": message}))
    sys.exit(1)


def r(value):
    return round(float(value), 3)


def hidden_layers(doc):
    hidden = set()
    for layer in doc.layers:
        if layer.is_off() or layer.is_frozen():
            hidden.add(layer.dxf.name)
    return hidden


def mline_faces(entity):
    # Same as mlineFaces in dxfParserService.js: two faces of the wall.
    points = [(v.location.x, v.location.y) for v in entity.vertices]
    if entity.is_closed and len(points) > 2:
        points.append(points[0])
    justification = entity.dxf.justification
    shift = 0.5 if justification == 0 else -0.5 if justification == 2 else 0
    scale = entity.dxf.scale_factor
    offsets = [(0.5 - shift) * scale, (-0.5 - shift) * scale]
    faces = []
    for (ax, ay), (bx, by) in zip(points, points[1:]):
        length = math.hypot(bx - ax, by - ay)
        if length == 0:
            continue
        nx, ny = -(by - ay) / length, (bx - ax) / length
        for o in offsets:
            faces.append({"type": "polyline", "closed": False,
                          "points": [{"x": r(ax + nx * o), "y": r(ay + ny * o)}, {"x": r(bx + nx * o), "y": r(by + ny * o)}]})
    return faces


def extract_shapes(doc):
    hidden = hidden_layers(doc)
    shapes = []
    for e in doc.modelspace():
        if e.dxf.layer in hidden or e.dxf.get("invisible", 0):
            continue
        kind = e.dxftype()
        if kind == "LINE":
            shapes.append({"type": "polyline", "closed": False,
                           "points": [{"x": r(e.dxf.start.x), "y": r(e.dxf.start.y)}, {"x": r(e.dxf.end.x), "y": r(e.dxf.end.y)}]})
        elif kind == "LWPOLYLINE":
            pts = [{"x": r(p[0]), "y": r(p[1])} for p in e.get_points("xy")]
            if len(pts) >= 2:
                shapes.append({"type": "polyline", "points": pts, "closed": bool(e.closed)})
        elif kind == "POLYLINE":
            pts = [{"x": r(v.dxf.location.x), "y": r(v.dxf.location.y)} for v in e.vertices]
            if len(pts) >= 2:
                shapes.append({"type": "polyline", "points": pts, "closed": bool(e.is_closed)})
        elif kind == "MLINE":
            shapes.extend(mline_faces(e))
        elif kind == "CIRCLE":
            shapes.append({"type": "circle", "cx": r(e.dxf.center.x), "cy": r(e.dxf.center.y), "r": r(e.dxf.radius)})
        elif kind == "ARC":
            shapes.append({"type": "arc", "cx": r(e.dxf.center.x), "cy": r(e.dxf.center.y), "r": r(e.dxf.radius),
                           "startAngle": r(e.dxf.start_angle), "endAngle": r(e.dxf.end_angle)})
    return shapes


def bounds_of(shapes):
    xs, ys = [], []
    for s in shapes:
        if s["type"] == "polyline":
            xs += [p["x"] for p in s["points"]]
            ys += [p["y"] for p in s["points"]]
        else:
            xs += [s["cx"] - s["r"], s["cx"] + s["r"]]
            ys += [s["cy"] - s["r"], s["cy"] + s["r"]]
    if not xs:
        return None
    return {"minX": min(xs), "minY": min(ys), "maxX": max(xs), "maxY": max(ys)}


def main():
    try:
        request = json.loads(sys.stdin.read())
        path = request["dxfPath"]
    except (ValueError, KeyError, TypeError) as exc:
        fail(f"Invalid preview request: {exc}")
    try:
        doc = ezdxf.readfile(path)
    except (IOError, OSError):
        fail("The floor plan file is no longer available.")
    except DXFStructureError as exc:
        fail(f"Could not read the floor plan: {exc}")
    shapes = extract_shapes(doc)
    bounds = bounds_of(shapes)
    if bounds is None:
        fail("No drawable geometry in this floor plan.")
    print(json.dumps({"shapes": shapes, "bounds": bounds}))


if __name__ == "__main__":
    main()

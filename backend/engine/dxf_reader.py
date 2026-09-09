"""
DXF geometry extraction — reads the TCC layer convention documented in the
capstone paper (Table 22): WALL, DOOR, WINDOW, COLUMN, STAIR, ROOF, FLOOR.
All source coordinates are millimeters (Table 23); every length/area
returned here is already converted to meters / square meters.
"""
import math

MM_TO_M = 1 / 1000

STANDARD_DOOR_HEIGHT_M = 2.1
STANDARD_WINDOW_HEIGHT_M = 1.2

LAYER_ALIASES = {
    "wall": "WALL", "walls": "WALL",
    "door": "DOOR", "doors": "DOOR",
    "window": "WINDOW", "windows": "WINDOW",
    "column": "COLUMN", "columns": "COLUMN",
    "stair": "STAIR", "stairs": "STAIR",
    "roof": "ROOF", "roofing": "ROOF",
    "floor": "FLOOR", "floor_area": "FLOOR",
}


def normalize_layer(name):
    return LAYER_ALIASES.get((name or "").strip().lower(), (name or "").strip().upper())


def entity_layer(entity):
    return normalize_layer(entity.dxf.layer)


def polyline_points(entity):
    """Returns a list of (x, y) tuples in meters for LWPOLYLINE/POLYLINE."""
    if entity.dxftype() == "LWPOLYLINE":
        return [(p[0] * MM_TO_M, p[1] * MM_TO_M) for p in entity.get_points()]
    if entity.dxftype() == "POLYLINE":
        return [(v.dxf.location.x * MM_TO_M, v.dxf.location.y * MM_TO_M) for v in entity.vertices]
    return []


def segment_length(p1, p2):
    return math.hypot(p2[0] - p1[0], p2[1] - p1[1])


def polyline_length(points, closed):
    if len(points) < 2:
        return 0.0
    total = sum(segment_length(points[i], points[i + 1]) for i in range(len(points) - 1))
    if closed and len(points) > 2:
        total += segment_length(points[-1], points[0])
    return total


def shoelace_area(points):
    if len(points) < 3:
        return 0.0
    total = 0.0
    n = len(points)
    for i in range(n):
        x1, y1 = points[i]
        x2, y2 = points[(i + 1) % n]
        total += x1 * y2 - x2 * y1
    return abs(total) / 2


def bounding_box(points):
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return min(xs), min(ys), max(xs), max(ys)


def entities_on_layer(msp, layer):
    return [e for e in msp if entity_layer(e) == layer]


def is_closed_polyline(entity):
    """Whether a polyline is actually flagged closed in the file.

    LWPOLYLINE exposes `.closed` and old-style POLYLINE exposes `.is_closed`,
    so checking only one of them silently misses the other; both set bit 1 of
    group code 70, which is what the `flags` fallback covers. WALL already did
    this check inline. ROOF used to just assume closed=True, which added a
    phantom closing segment to any open roof line it read.
    """
    return (bool(getattr(entity, "closed", False))
            or bool(getattr(entity, "is_closed", False))
            or bool(getattr(entity.dxf, "flags", 0) & 1))


def merge_bounds(current, points):
    """Grows a [xmin, ymin, xmax, ymax] box to include `points`."""
    xmin, ymin, xmax, ymax = bounding_box(points)
    if current is None:
        return [xmin, ymin, xmax, ymax]
    return [min(current[0], xmin), min(current[1], ymin),
            max(current[2], xmax), max(current[3], ymax)]


# Two endpoints this close (1mm, one drawing unit) count as the same point
# when stitching loose lines together.
JOIN_TOLERANCE_M = 0.001


def _same_point(a, b):
    return abs(a[0] - b[0]) <= JOIN_TOLERANCE_M and abs(a[1] - b[1]) <= JOIN_TOLERANCE_M


def chain_segments(segments):
    """Stitches loose LINE segments end-to-end and returns the closed loops.

    A room outline drawn as four separate LINEs is just as valid a floor plan
    as one closed polyline, but the FLOOR layer only read polylines, so those
    plans came back with zero area and failed with an error blaming the layer
    *name*. Segments arrive in no particular order, so this walks from one
    chain's end to whichever unused segment touches it, and keeps only the
    rings that actually close back on themselves.
    """
    remaining = list(segments)
    loops = []
    while remaining:
        start, end = remaining.pop()
        loop = [start, end]
        while True:
            for i, (a, b) in enumerate(remaining):
                if _same_point(loop[-1], a):
                    loop.append(b)
                elif _same_point(loop[-1], b):
                    loop.append(a)
                else:
                    continue
                remaining.pop(i)
                break
            else:
                break  # nothing left connects to this chain
        # Only a ring encloses an area; an open run of lines is ignored.
        if len(loop) >= 4 and _same_point(loop[-1], loop[0]):
            loops.append(loop[:-1])  # drop the repeated closing point
    return loops


def extract_geometry(doc):
    msp = doc.modelspace()

    wall_length_m = 0.0
    for e in entities_on_layer(msp, "WALL"):
        if e.dxftype() == "LINE":
            p1 = (e.dxf.start.x * MM_TO_M, e.dxf.start.y * MM_TO_M)
            p2 = (e.dxf.end.x * MM_TO_M, e.dxf.end.y * MM_TO_M)
            wall_length_m += segment_length(p1, p2)
        elif e.dxftype() in ("LWPOLYLINE", "POLYLINE"):
            points = polyline_points(e)
            wall_length_m += polyline_length(points, is_closed_polyline(e))

    floor_area_m2 = 0.0
    rooms_detected = 0
    floor_perimeter_m = 0.0
    floor_bounds = None
    floor_line_segments = []
    for e in entities_on_layer(msp, "FLOOR"):
        if e.dxftype() in ("LWPOLYLINE", "POLYLINE"):
            points = polyline_points(e)
            if len(points) >= 3:
                floor_area_m2 += shoelace_area(points)
                # closed=True regardless of the flag here (unlike WALL/ROOF) so
                # the perimeter stays consistent with shoelace_area, which
                # closes the ring implicitly.
                floor_perimeter_m += polyline_length(points, closed=True)
                rooms_detected += 1
                floor_bounds = merge_bounds(floor_bounds, points)
        elif e.dxftype() == "LINE":
            # Collected rather than measured one at a time: a single line is
            # only an edge, it takes a full ring of them to enclose a room.
            floor_line_segments.append((
                (e.dxf.start.x * MM_TO_M, e.dxf.start.y * MM_TO_M),
                (e.dxf.end.x * MM_TO_M, e.dxf.end.y * MM_TO_M),
            ))

    for loop in chain_segments(floor_line_segments):
        if len(loop) >= 3:
            floor_area_m2 += shoelace_area(loop)
            floor_perimeter_m += polyline_length(loop, closed=True)
            rooms_detected += 1
            floor_bounds = merge_bounds(floor_bounds, loop)

    def opening_area(layer, standard_height):
        total = 0.0
        for e in entities_on_layer(msp, layer):
            if e.dxftype() == "LINE":
                p1 = (e.dxf.start.x * MM_TO_M, e.dxf.start.y * MM_TO_M)
                p2 = (e.dxf.end.x * MM_TO_M, e.dxf.end.y * MM_TO_M)
                width = segment_length(p1, p2)
            elif e.dxftype() in ("LWPOLYLINE", "POLYLINE"):
                points = polyline_points(e)
                if not points:
                    continue
                if len(points) == 2:
                    # Same span the LINE branch above would measure, so measure
                    # it the same way. The bounding box below is right for a
                    # rectangle but understates a 2-point diagonal (a 1.0m
                    # opening at 45 degrees boxes to 0.707m), which made the
                    # answer depend on which entity type the drafter picked.
                    width = segment_length(points[0], points[1])
                else:
                    xmin, ymin, xmax, ymax = bounding_box(points)
                    width = max(xmax - xmin, ymax - ymin)
            else:
                continue
            total += width * standard_height
        return total

    door_area_m2 = opening_area("DOOR", STANDARD_DOOR_HEIGHT_M)
    window_area_m2 = opening_area("WINDOW", STANDARD_WINDOW_HEIGHT_M)

    column_count = len(entities_on_layer(msp, "COLUMN"))

    roof_perimeter_m = 0.0
    roof_ridge_length_m = 0.0
    roof_bounds = None
    roof_entities = entities_on_layer(msp, "ROOF")
    for e in roof_entities:
        if e.dxftype() in ("LWPOLYLINE", "POLYLINE"):
            points = polyline_points(e)
            if len(points) >= 2:
                # Was hardcoded closed=True, which invented a closing segment
                # for an open eave/hip line and inflated every perimeter-driven
                # roofing accessory (flashing, gutter, angle bar). WALL reads
                # the real flag, so ROOF does now too.
                roof_perimeter_m += polyline_length(points, is_closed_polyline(e))
                roof_bounds = merge_bounds(roof_bounds, points)
        elif e.dxftype() == "LINE":
            p1 = (e.dxf.start.x * MM_TO_M, e.dxf.start.y * MM_TO_M)
            p2 = (e.dxf.end.x * MM_TO_M, e.dxf.end.y * MM_TO_M)
            length = segment_length(p1, p2)
            # A standalone LINE on the ROOF layer is treated as an explicit
            # ridge line — it wins over the bounding-box estimate below.
            roof_ridge_length_m = max(roof_ridge_length_m, length)

    # No explicit ridge LINE was drawn (the common case: ROOF layer is just
    # one closed outline) — approximate ridge length as the shorter side of
    # the roof outline's bounding box, i.e. a simple gable running along the
    # longer axis. Falls back further to the floor boundary when there's no
    # ROOF layer at all (not from the paper; both are noted assumptions).
    bounds_for_ridge = roof_bounds if roof_bounds else floor_bounds
    if roof_ridge_length_m == 0.0 and bounds_for_ridge:
        xmin, ymin, xmax, ymax = bounds_for_ridge
        roof_ridge_length_m = min(xmax - xmin, ymax - ymin)

    if not roof_entities and floor_bounds:
        xmin, ymin, xmax, ymax = floor_bounds
        roof_perimeter_m = 2 * ((xmax - xmin) + (ymax - ymin))

    return {
        "wall_length_m": wall_length_m,
        "door_area_m2": door_area_m2,
        "window_area_m2": window_area_m2,
        "floor_area_m2": floor_area_m2,
        "floor_perimeter_m": floor_perimeter_m,
        "rooms_detected": rooms_detected,
        "column_count": column_count,
        "roof_perimeter_m": roof_perimeter_m,
        "roof_ridge_length_m": roof_ridge_length_m,
        "floor_bounds": floor_bounds,
    }

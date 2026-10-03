"""
Reads the DXF layers from the capstone paper (Table 22): WALL, DOOR, WINDOW,
COLUMN, STAIR, ROOF, FLOOR. Source units are millimeters (Table 23); results
are returned in meters and square meters.

Also reads optional layers from Engr. Espiritu's notation (Reply 4): COL (same
as COLUMN), BEAM, CANTBEAM and TRUSS. A file without them returns 0 for each.
FTG and FTBEAM are not read. Keep LayerNamesGuide.jsx in sync with LAYER_ALIASES.

Walls: a wall drawn as two parallel faces (LINE or polyline) is counted once,
by pairing the faces (see wall_run_length). A wall drawn as one line counts as
drawn. An MLINE wall is measured once along its reference line (see
mline_length). Limits are in docs/paper-limitations.md entry 6.
"""
import math
import re

MM_TO_M = 1 / 1000

STANDARD_DOOR_HEIGHT_M = 2.1
STANDARD_WINDOW_HEIGHT_M = 1.2

LAYER_ALIASES = {
    "wall": "WALL", "walls": "WALL",
    "door": "DOOR", "doors": "DOOR",
    "window": "WINDOW", "windows": "WINDOW",
    "column": "COLUMN", "columns": "COLUMN", "col": "COLUMN",
    "stair": "STAIR", "stairs": "STAIR",
    "roof": "ROOF", "roofing": "ROOF",
    "floor": "FLOOR", "floor_area": "FLOOR",
    # Optional layers (Reply 4's notation).
    "beam": "BEAM", "beams": "BEAM",
    "cantbeam": "CANTBEAM",
    "truss": "TRUSS", "trusses": "TRUSS",
}

# Splits a layer name on non-alphanumeric characters, so "WALL-150" and
# "A-WALL" both give a "WALL" token.
_LAYER_TOKEN_RE = re.compile(r"[^A-Za-z0-9]+")


def normalize_layer(name):
    """Maps a DXF layer name to the paper's names (WALL, DOOR, etc).

    Splits the name into tokens and checks each one against LAYER_ALIASES, so
    "A-WALL" and "WALL-150" match but "WALLPAPER" does not.
    """
    cleaned = (name or "").strip()
    whole = cleaned.lower()
    if whole in LAYER_ALIASES:
        return LAYER_ALIASES[whole]
    for token in _LAYER_TOKEN_RE.split(whole):
        if token in LAYER_ALIASES:
            return LAYER_ALIASES[token]
    return cleaned.upper()


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
    """True if the polyline is flagged closed.

    LWPOLYLINE uses .closed and POLYLINE uses .is_closed. Both set bit 1 of
    group code 70, so flags is the fallback.
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


# Endpoints within 1mm count as the same point when joining loose lines.
JOIN_TOLERANCE_M = 0.001


def _same_point(a, b):
    return abs(a[0] - b[0]) <= JOIN_TOLERANCE_M and abs(a[1] - b[1]) <= JOIN_TOLERANCE_M


def chain_segments(segments):
    """Joins loose LINE segments end to end and returns the closed loops.

    A room drawn as separate LINEs still counts as a floor. Segments come in
    any order, so this follows each chain to the next segment that touches it
    and keeps only the loops that close.
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


def mline_length(entity):
    """Length of an MLINE (AutoCAD multiline) along its reference line.

    A multiline wall is one path drawn as two faces, so its reference line is
    the wall's own run. With ZERO justification this is the centerline.
    """
    points = [(v[0] * MM_TO_M, v[1] * MM_TO_M) for v in entity.get_locations()]
    return polyline_length(points, entity.is_closed)


def mline_thickness(entity):
    """Wall thickness of an MLINE: the spread of its style's line offsets x
    its scale. 0 if the style can't be read."""
    try:
        offsets = [element.offset for element in entity.style.elements]
        return (max(offsets) - min(offsets)) * abs(entity.dxf.scale_factor) * MM_TO_M
    except (AttributeError, ValueError, TypeError):
        return 0.0


# Two faces this far apart are one wall. Covers 100mm and 150mm CHB walls with
# plaster. A wall thicker or thinner than this is not paired.
WALL_MIN_THICKNESS_M = 0.08
WALL_MAX_THICKNESS_M = 0.30
# A wall this thick or more is taken as 6" (150mm) CHB, thinner as 4" (100mm).
# Mortar differs by CHB size (Fajardo Table 2-2). A one-line wall has no
# thickness, so it counts as 4".
SIX_INCH_WALL_MIN_M = 0.125
# Faces within 1 degree count as parallel.
PARALLEL_TOLERANCE = math.sin(math.radians(1.0))


def _face_info(segment):
    """Length, direction and bounding box of one wall face."""
    (ax, ay), (bx, by) = segment
    length = segment_length((ax, ay), (bx, by))
    box = (min(ax, bx), min(ay, by), max(ax, bx), max(ay, by))
    return length, (bx - ax) / length, (by - ay) / length, box


# Grid cell size for finding nearby faces, so a big plan doesn't compare every
# face with every other one.
NEARBY_CELL_M = 2.0


def _cells(box):
    """Grid cells a face's box touches, grown by one wall thickness."""
    x0 = math.floor((box[0] - WALL_MAX_THICKNESS_M) / NEARBY_CELL_M)
    x1 = math.floor((box[2] + WALL_MAX_THICKNESS_M) / NEARBY_CELL_M)
    y0 = math.floor((box[1] - WALL_MAX_THICKNESS_M) / NEARBY_CELL_M)
    y1 = math.floor((box[3] + WALL_MAX_THICKNESS_M) / NEARBY_CELL_M)
    return [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]


def _paired_parts(index, segments, infos, nearby):
    """Parts of one wall face (distances along it) that have a parallel face
    at wall thickness across from them, each with the gap to that face."""
    (ax, ay), (bx, by) = segments[index]
    length, ux, uy, box = infos[index]
    parts = []
    for j in nearby:
        if j == index:
            continue
        (cx, cy), (dx, dy) = segments[j]
        _, vx, vy, other_box = infos[j]
        # Quick skip: faces whose boxes are more than a wall apart can't pair.
        if (other_box[0] > box[2] + WALL_MAX_THICKNESS_M or other_box[2] < box[0] - WALL_MAX_THICKNESS_M
                or other_box[1] > box[3] + WALL_MAX_THICKNESS_M or other_box[3] < box[1] - WALL_MAX_THICKNESS_M):
            continue
        if abs(ux * vy - uy * vx) > PARALLEL_TOLERANCE:
            continue
        # Both ends of the other face must sit at wall thickness from this one.
        gap1 = abs((cx - ax) * uy - (cy - ay) * ux)
        gap2 = abs((dx - ax) * uy - (dy - ay) * ux)
        if not all(WALL_MIN_THICKNESS_M <= gap <= WALL_MAX_THICKNESS_M for gap in (gap1, gap2)):
            continue
        # Where the other face overlaps this one along its length.
        s1 = (cx - ax) * ux + (cy - ay) * uy
        s2 = (dx - ax) * ux + (dy - ay) * uy
        start, end = max(0.0, min(s1, s2)), min(length, max(s1, s2))
        if end > start:
            parts.append([start, end, (gap1 + gap2) / 2])
    return length, parts


def wall_run_length(segments):
    """Wall length from LINE/polyline faces, counting a two-face wall once.

    The part of a face that has a partner face counts half, since the two
    faces are one wall. Gaps up to one wall thickness are filled in, so the
    outer face sticking out at a corner and the break at a T-junction also
    count half. A face with no partner counts in full.

    Returns (total length, length of 6" walls). A face takes its thickness
    from the partner it overlaps most.
    """
    infos = [_face_info(s) for s in segments]
    grid = {}
    for i, info in enumerate(infos):
        for cell in _cells(info[3]):
            grid.setdefault(cell, []).append(i)
    total = 0.0
    six_inch = 0.0
    for i in range(len(segments)):
        nearby = {j for cell in _cells(infos[i][3]) for j in grid[cell]}
        length, parts = _paired_parts(i, segments, infos, nearby)
        if not parts:
            total += length
            continue
        thickness = max(parts, key=lambda part: part[1] - part[0])[2]
        parts = sorted([start, end] for start, end, _gap in parts)
        merged = [parts[0]]
        for start, end in parts[1:]:
            if start - merged[-1][1] <= WALL_MAX_THICKNESS_M:
                merged[-1][1] = max(merged[-1][1], end)
            else:
                merged.append([start, end])
        if merged[0][0] <= WALL_MAX_THICKNESS_M:
            merged[0][0] = 0.0
        if length - merged[-1][1] <= WALL_MAX_THICKNESS_M:
            merged[-1][1] = length
        paired = sum(end - start for start, end in merged)
        counted = (length - paired) + paired / 2
        total += counted
        if thickness >= SIX_INCH_WALL_MIN_M:
            six_inch += counted
    return total, six_inch


def member_run_length(msp, layer):
    """Total length of the members (beams, trusses) drawn on a layer.

    A LINE or open polyline counts its full length. A closed polyline counts
    only its longest side, since the perimeter would count the member twice.
    A member drawn as two edge lines still counts twice, so the upload guide
    asks for centerlines.
    """
    total = 0.0
    for e in entities_on_layer(msp, layer):
        if e.dxftype() == "LINE":
            p1 = (e.dxf.start.x * MM_TO_M, e.dxf.start.y * MM_TO_M)
            p2 = (e.dxf.end.x * MM_TO_M, e.dxf.end.y * MM_TO_M)
            total += segment_length(p1, p2)
        elif e.dxftype() in ("LWPOLYLINE", "POLYLINE"):
            points = polyline_points(e)
            if len(points) < 2:
                continue
            if is_closed_polyline(e):
                xmin, ymin, xmax, ymax = bounding_box(points)
                total += max(xmax - xmin, ymax - ymin)
            else:
                total += polyline_length(points, closed=False)
        elif e.dxftype() == "MLINE":
            total += mline_length(e)
    return total


def extract_geometry(doc):
    msp = doc.modelspace()

    wall_length_m = 0.0
    six_inch_wall_length_m = 0.0
    wall_segments = []
    for e in entities_on_layer(msp, "WALL"):
        if e.dxftype() == "LINE":
            wall_segments.append((
                (e.dxf.start.x * MM_TO_M, e.dxf.start.y * MM_TO_M),
                (e.dxf.end.x * MM_TO_M, e.dxf.end.y * MM_TO_M),
            ))
        elif e.dxftype() in ("LWPOLYLINE", "POLYLINE"):
            # Split into straight sides so each side can find its partner face.
            points = polyline_points(e)
            wall_segments.extend(zip(points, points[1:]))
            if is_closed_polyline(e) and len(points) > 2:
                wall_segments.append((points[-1], points[0]))
        elif e.dxftype() == "MLINE":
            # One multiline = one wall, however many faces its style draws.
            run = mline_length(e)
            wall_length_m += run
            if mline_thickness(e) >= SIX_INCH_WALL_MIN_M:
                six_inch_wall_length_m += run
    # Zero-length sides (repeated points) have no direction, so they're skipped.
    wall_segments = [s for s in wall_segments if segment_length(*s) > 1e-9]
    face_run, face_six_inch = wall_run_length(wall_segments)
    wall_length_m += face_run
    six_inch_wall_length_m += face_six_inch

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
                # Always closed so the perimeter matches shoelace_area.
                floor_perimeter_m += polyline_length(points, closed=True)
                rooms_detected += 1
                floor_bounds = merge_bounds(floor_bounds, points)
        elif e.dxftype() == "LINE":
            # Collected first: a room needs a full ring of lines, not one line.
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
        # An opening is often drawn as several pieces (a frame rectangle plus
        # glass lines and jamb ticks, or a door leaf plus its swing arc), so
        # each shape is measured once and loose lines inside it are skipped.
        shapes = []  # (points, is_closed) for polylines of 3+ points
        segments = []  # 2-point pieces: LINEs and 2-point polylines
        for e in entities_on_layer(msp, layer):
            if e.dxftype() == "LINE":
                segments.append([(e.dxf.start.x * MM_TO_M, e.dxf.start.y * MM_TO_M),
                                 (e.dxf.end.x * MM_TO_M, e.dxf.end.y * MM_TO_M)])
            elif e.dxftype() in ("LWPOLYLINE", "POLYLINE"):
                points = polyline_points(e)
                if len(points) == 2:
                    segments.append(points)
                elif len(points) > 2:
                    shapes.append((points, is_closed_polyline(e)))

        total_width = 0.0
        shape_boxes = []
        for points, closed in shapes:
            xmin, ymin, xmax, ymax = bounding_box(points)
            width, depth = xmax - xmin, ymax - ymin
            # Closed shape (opening drawn in the wall): its long side.
            # Open shape (door leaf plus swing arc): its short side, since the
            # arc makes the box longer than the door is wide.
            total_width += max(width, depth) if closed else min(width, depth)
            shape_boxes.append((xmin, ymin, xmax, ymax))

        def inside_a_shape(p1, p2, tol=0.01):  # 10 mm tolerance
            return any(all(xmin - tol <= x <= xmax + tol and ymin - tol <= y <= ymax + tol for x, y in (p1, p2))
                       for xmin, ymin, xmax, ymax in shape_boxes)

        for p1, p2 in segments:
            # Glass lines, jamb ticks and leaf lines sit inside a shape above.
            if inside_a_shape(p1, p2):
                continue
            # Measure the span, since a bounding box understates a diagonal line.
            total_width += segment_length(p1, p2)
        return total_width * standard_height

    door_area_m2 = opening_area("DOOR", STANDARD_DOOR_HEIGHT_M)
    window_area_m2 = opening_area("WINDOW", STANDARD_WINDOW_HEIGHT_M)

    # Only polylines count as columns (a column is drawn as one rectangle).
    # Loose LINEs are skipped so a stray line is not counted.
    column_count = sum(1 for e in entities_on_layer(msp, "COLUMN") if e.dxftype() in ("LWPOLYLINE", "POLYLINE"))

    roof_perimeter_m = 0.0
    roof_ridge_length_m = 0.0
    roof_bounds = None
    roof_entities = entities_on_layer(msp, "ROOF")
    for e in roof_entities:
        if e.dxftype() in ("LWPOLYLINE", "POLYLINE"):
            points = polyline_points(e)
            if len(points) >= 2:
                # Use the real closed flag so an open eave line does not get
                # an extra closing segment.
                roof_perimeter_m += polyline_length(points, is_closed_polyline(e))
                roof_bounds = merge_bounds(roof_bounds, points)
        elif e.dxftype() == "LINE":
            p1 = (e.dxf.start.x * MM_TO_M, e.dxf.start.y * MM_TO_M)
            p2 = (e.dxf.end.x * MM_TO_M, e.dxf.end.y * MM_TO_M)
            length = segment_length(p1, p2)
            # A LINE on ROOF is treated as an explicit ridge line.
            roof_ridge_length_m = max(roof_ridge_length_m, length)

    # With no ridge LINE, the ridge is the shorter side of the roof outline's
    # bounding box (a simple gable). With no ROOF layer it falls back to the
    # floor boundary. Both are our assumptions, not from the paper.
    bounds_for_ridge = roof_bounds if roof_bounds else floor_bounds
    if roof_ridge_length_m == 0.0 and bounds_for_ridge:
        xmin, ymin, xmax, ymax = bounds_for_ridge
        roof_ridge_length_m = min(xmax - xmin, ymax - ymin)

    if not roof_entities and floor_bounds:
        xmin, ymin, xmax, ymax = floor_bounds
        roof_perimeter_m = 2 * ((xmax - xmin) + (ymax - ymin))

    # Optional layers. All 0 when the layer is missing.
    beam_length_m = member_run_length(msp, "BEAM")
    cantbeam_length_m = member_run_length(msp, "CANTBEAM")
    # truss_count is not used yet. Kept for a future rule turning trusses
    # into angle bar pieces (Reply 4).
    truss_count = sum(1 for e in entities_on_layer(msp, "TRUSS") if e.dxftype() in ("LINE", "LWPOLYLINE", "POLYLINE"))
    truss_length_m = member_run_length(msp, "TRUSS")

    return {
        "wall_length_m": wall_length_m,
        "six_inch_wall_length_m": six_inch_wall_length_m,
        "door_area_m2": door_area_m2,
        "window_area_m2": window_area_m2,
        "floor_area_m2": floor_area_m2,
        "floor_perimeter_m": floor_perimeter_m,
        "rooms_detected": rooms_detected,
        "column_count": column_count,
        "roof_perimeter_m": roof_perimeter_m,
        "roof_ridge_length_m": roof_ridge_length_m,
        "floor_bounds": floor_bounds,
        "beam_length_m": beam_length_m,
        "cantbeam_length_m": cantbeam_length_m,
        "truss_count": truss_count,
        "truss_length_m": truss_length_m,
    }

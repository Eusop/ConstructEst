"""
Quantity take-off for the capstone paper's Tables 12-19 (wall, slab, column,
beam, roofing, footing, stair, scaffolding and formwork). Uses the geometry
from dxf_reader.py and returns quantities for the 16 material keys the
frontend uses (see parsedProjectCache.js).

Inputs a 2D DXF can't give (beam size, floor-to-floor height, building
height) are optional overrides with the paper's default values, as the
paper's Estimation Calibration Settings intends (Section 4.3.3.2).

If a second floor file is given (geometry2, 2-storey only), each floor uses
its own walls, slab, columns and roof. Without it, the ground floor is reused.
One file is always read as one floor (docs/paper-limitations.md entry 1).

Assumptions (Engr. Espiritu's corrections are applied where noted):
  - Rebar: 10mm for walls and ground slab, 12mm for the 2nd floor slab.
    Stairs use 10mm, which is our assumption.
  - Column rebar: 4 bars per column (NSCP minimum, docs/nscp-citations.md).
    Diameter is 12mm (1-storey) or 16mm (2-storey). 4 x 12mm is only valid
    for a bungalow (Reply 3). The 2-storey 4 x 16mm is not expert validated,
    so it stays editable.
  - Column concrete, rebar and formwork are per floor when a second floor
    file is given (Reply 2). Each floor uses its own COLUMN count, the total
    height is split evenly, and the 2nd floor can have its own size.
    Footings use the ground floor count only.
  - Angle bar is doubled (Reply 1). The larger size is a catalog matter.
    Table 16 has no angle bar formula, so it uses roof perimeter / 6m.
  - Roofing adds one scaffold layer to the height (our assumption, the
    engineer gave no figure).
  - Footing plan size defaults to 0.60m x 0.60m (the paper gives depth only).
  - Beam length comes from the BEAM layer (plus CANTBEAM) when a floor has
    one (Reply 4). Otherwise it uses that floor's wall length. Beam rebar has
    no paper formula, so it is a manual override (total length and bar size).
  - A TRUSS layer adds interior scaffolding for roof work (Reply 3), only when
    roofing is included. Its height is our assumption: top storey plus the
    roofing allowance (4.2m at the defaults). TRUSS does not affect angle bar,
    since a plan line is shorter than the real chords and webs.
  - Purlin run is half the roof perimeter (Table 16's "roof length along the
    slope" is not defined). Gutter length also uses the roof perimeter.
  - Formwork is a one-time purchase of the full quantity, as in Table 19. A
    local civil engineer agreed on 2026-09-07: reuse depends on plywood
    thickness and whether pieces stay usable, so it is treated as an optional
    price adjustment, not a quantity change. The BOM (computeBom in
    optimization.service.js) prices what this file returns. Two exceptions
    live there: lumber is listed in whole pieces, and the scaffolding price is
    divided by an assumed reuse count.
"""
import math

WALL_HEIGHT_PER_STOREY_M = 3.0
# Fallback only. The height used everywhere (walls, stairs, scaffolding) is
# floor_to_floor_h, so a floorToFloorHeight override reaches every material.
# Used only when the DXF has no COLUMN layer. It is not an override key.
DEFAULT_COLUMN_COUNT = 4
# Bar weight in kg/m = d^2/162 (d in mm), from the PNS/DPWH table. 10mm for
# walls and ground slab, 12mm for the 2nd floor slab (Engr. Espiritu).
REBAR_UNIT_WEIGHT_10MM_KG_PER_M = 0.617
REBAR_UNIT_WEIGHT_12MM_KG_PER_M = 0.889
# 16mm, same formula. Used for 2-storey column rebar (validated diameter).
REBAR_UNIT_WEIGHT_16MM_KG_PER_M = 1.580

# Bar count per column, from NSCP minimum reinforcement rules
# (docs/nscp-citations.md), not the paper. Engr. Espiritu confirmed 4 x 12mm
# only for a bungalow (Reply 3). The 2-storey 4 x 16mm is not validated
# (Reply 2 says there is no valid default).
COLUMN_REBAR_BAR_COUNT = 4
# Column rebar diameter per storey type (validated).
COLUMN_REBAR_DIAMETER_MM = {1: 12, 2: 16}

# NSCP 2016 moderate slope, rise:run = 1:3 -> sqrt(rise^2 + run^2) / run = sqrt(10) / 3
PITCH_MULTIPLIER = math.sqrt(10) / 3

# Countable items are rounded up (Tables 12-19), since you can't buy part of a
# bag or sheet. Only bulk units (volume, weight) stay fractional. A unit in
# neither list raises an error below, so it can't silently stay fractional.
WHOLE_UNITS = ("pcs", "sheets", "lengths", "sets", "bd.ft.", "bags")
FRACTIONAL_UNITS = ("m3", "tons", "kg")


def ceil_int(value):
    return int(math.ceil(value)) if value > 0 else 0


def default_column_size(storeys):
    return (0.25, 0.25, 6.0) if storeys >= 2 else (0.20, 0.20, 3.0)


def default_footing_depth(storeys):
    return 2.0 if storeys >= 2 else 1.5


def rebar_unit_weight_kg_per_m(diameter_mm):
    """Steel bar mass in kg/m (d^2/162). Used when the bar size is a user input."""
    return (diameter_mm ** 2) / 162


# Each material contribution is tagged with the source that drove it.
# "roofing" and "shared" are not files: they cover parts that belong to no
# single floor (columns, footings, roof).
SOURCE_CATEGORIES = ("ground", "second", "roofing", "shared")


class MaterialAccumulator:
    """Adds up cement, sand, gravel and rebar from every structural element
    into one total per material key. Also keeps a per-category breakdown
    (see SOURCE_CATEGORIES); existing users of .totals are unaffected."""

    def __init__(self):
        self.totals = {}
        self.bases = {}
        self.by_category = {}  # key -> {category: amount}
        self.steps = {}  # key -> readable computation lines, shown as "Show computation"

    def add(self, key, amount, basis, category="shared", step=None):
        self.totals[key] = self.totals.get(key, 0.0) + amount
        # The first basis note is kept as the displayed formula.
        self.bases.setdefault(key, basis)
        cat_totals = self.by_category.setdefault(key, {})
        cat_totals[category] = cat_totals.get(category, 0.0) + amount
        if step:
            self.steps.setdefault(key, []).append(step)

    def add_concrete_mix(self, volume_m3, cement_factor, basis, category="shared", label=None):
        cement = volume_m3 * 9 * cement_factor
        sand = volume_m3 * 0.50
        gravel = volume_m3 * 1.0
        self.add("cement", cement, basis, category,
                 label and f"{label}: {num(volume_m3, 3)} m3 x 9 bags x {num(cement_factor)} cement factor = {num(cement)} bags")
        self.add("sand", sand, basis, category, label and f"{label}: {num(volume_m3, 3)} m3 x 0.50 = {num(sand, 3)} m3")
        self.add("gravel", gravel, basis, category, label and f"{label}: {num(volume_m3, 3)} m3 x 1.0 = {num(gravel, 3)} m3")


def num(value, decimals=2):
    """Number for the computation steps, e.g. 1,234.57."""
    return f"{value:,.{decimals}f}"


def compute_materials(geometry, storeys, include_roofing, constants, overrides, geometry2=None):
    # A second floor only applies to 2-storey projects, so ignore it otherwise.
    geometry2 = geometry2 if storeys >= 2 else None

    acc = MaterialAccumulator()
    cement_factor = constants.get("cementFactor", 1.08)
    steel_factor = constants.get("steelFactor", 1.05)
    roofing_factor = constants.get("roofingFactor", 1.07)
    wastage_multiplier = 1 + (constants.get("wastagePercent", 5) / 100)

    wall_length_m = geometry["wall_length_m"]
    door_area_m2 = geometry["door_area_m2"]
    window_area_m2 = geometry["window_area_m2"]
    floor_area_m2 = geometry["floor_area_m2"]
    floor_perimeter_m = geometry["floor_perimeter_m"]
    # Ground floor COLUMN count. Used for footings and the ground column
    # segment. With a second floor file, its own count is used for the second
    # segment (Table 14 below), because columns are not always footing-to-roof
    # (Engr. Espiritu), so estimation is per floor.
    detected_column_count = geometry["column_count"]
    if overrides.get("columnCount") is not None:
        column_count = overrides["columnCount"]
        column_count_source = "override"
    elif detected_column_count:
        column_count = detected_column_count
        column_count_source = "detected"
    else:
        # No COLUMN layer: keep going with a default, since simple plans may
        # not draw columns. It adds column and footing concrete, so it is
        # reported as "assumed", not as an extraction result.
        column_count = DEFAULT_COLUMN_COUNT
        column_count_source = "assumed"
    # roof_perimeter_m and roof_ridge_length_m are set in Table 16 below, from
    # whichever file holds the roof.

    # Rebar weight is tracked per category. Each contribution uses its own
    # diameter's unit weight, so length is converted to weight where it is added.
    rebar_weight_by_category = {category: 0.0 for category in SOURCE_CATEGORIES}
    rebar_steps = []  # readable lines for the rebar computation, in kg

    # --- Table 12: Wall materials -----------------------------------------
    # floor_to_floor_h drives every per-storey height (walls, stairs, and the
    # scaffolding height default), so an override reaches all of them.
    floor_to_floor_h = overrides.get("floorToFloorHeight", WALL_HEIGHT_PER_STOREY_M)

    # With a second floor file, storey 2 uses its own walls and openings.
    # Otherwise the ground floor geometry is reused for every storey.
    floor_geometries = [geometry, geometry2] if geometry2 is not None else [geometry]
    for storey in range(storeys):
        storey_geometry = floor_geometries[storey] if storey < len(floor_geometries) else floor_geometries[-1]
        storey_category = "second" if storey_geometry is geometry2 else "ground"
        storey_wall_length_m = storey_geometry["wall_length_m"]
        storey_door_area_m2 = storey_geometry["door_area_m2"]
        storey_window_area_m2 = storey_geometry["window_area_m2"]

        gross_wall_area = storey_wall_length_m * floor_to_floor_h
        net_wall_area = max(gross_wall_area - storey_door_area_m2 - storey_window_area_m2, 0.0)
        floor_label = 'Ground floor' if storey == 0 else ('Second floor' if storey_geometry is geometry2 else 'Second floor (ground plan reused)')
        wall_text = (f"{floor_label} walls: {num(storey_wall_length_m)} m x {num(floor_to_floor_h)} m - "
                     f"{num(storey_door_area_m2)} m2 doors - {num(storey_window_area_m2)} m2 windows = {num(net_wall_area)} m2")

        chb = net_wall_area * 12.5 * 1.05
        mortar_cement = net_wall_area * 0.522 * cement_factor
        mortar_sand = net_wall_area * 0.0435
        acc.add("hollowBlocks", chb, "Wall area / coverage", storey_category,
                f"{wall_text} x 12.5 pcs per m2 x 1.05 = {num(chb)} pcs")
        acc.add("cement", mortar_cement, "Wall area x mortar rate", storey_category,
                f"{floor_label} wall mortar: {num(net_wall_area)} m2 x 0.522 bags per m2 x {num(cement_factor)} cement factor = {num(mortar_cement)} bags")
        acc.add("sand", mortar_sand, "Wall area x mortar rate", storey_category,
                f"{floor_label} wall mortar: {num(net_wall_area)} m2 x 0.0435 m3 per m2 = {num(mortar_sand, 3)} m3")

        vertical_bars = ceil_int(storey_wall_length_m / 0.60) + 1
        horizontal_bars = ceil_int(floor_to_floor_h / 0.60) + 1
        wall_rebar_length_m = vertical_bars * floor_to_floor_h + horizontal_bars * storey_wall_length_m
        wall_rebar_kg = wall_rebar_length_m * REBAR_UNIT_WEIGHT_10MM_KG_PER_M
        rebar_weight_by_category[storey_category] += wall_rebar_kg
        rebar_steps.append(
            f"{floor_label} walls, 10mm @ 0.60 m: {vertical_bars} vertical bars x {num(floor_to_floor_h)} m + "
            f"{horizontal_bars} horizontal bars x {num(storey_wall_length_m)} m = {num(wall_rebar_length_m)} m x 0.617 kg/m = {num(wall_rebar_kg)} kg")

    # --- Table 13: Slab materials ------------------------------------------
    ground_slab_volume = floor_area_m2 * 0.15
    acc.add_concrete_mix(ground_slab_volume, cement_factor, "Ground slab volume x mix rate", "ground",
                         f"Ground slab {num(floor_area_m2)} m2 x 0.15 m")
    bounds = geometry.get("floor_bounds")
    if bounds:
        floor_len = max(bounds[2] - bounds[0], 0.01)
        floor_wid = max(bounds[3] - bounds[1], 0.01)
        rebar_len_count = ceil_int(floor_len / 0.30) + 1
        rebar_wid_count = ceil_int(floor_wid / 0.30) + 1
        ground_slab_rebar_length_m = rebar_len_count * floor_wid + rebar_wid_count * floor_len
        ground_slab_rebar_kg = ground_slab_rebar_length_m * REBAR_UNIT_WEIGHT_10MM_KG_PER_M
        rebar_weight_by_category["ground"] += ground_slab_rebar_kg
        rebar_steps.append(
            f"Ground slab, 10mm @ 0.30 m: {rebar_len_count} bars x {num(floor_wid)} m + {rebar_wid_count} bars x "
            f"{num(floor_len)} m = {num(ground_slab_rebar_length_m)} m x 0.617 kg/m = {num(ground_slab_rebar_kg)} kg")

    if storeys >= 2:
        # Use the 2nd floor's own footprint when its DXF is given (it can differ,
        # e.g. over an open garage). Otherwise the ground floor footprint stands
        # in and is labeled "ground".
        suspended_source = geometry2 if geometry2 is not None else geometry
        suspended_category = "second" if geometry2 is not None else "ground"
        suspended_floor_area_m2 = suspended_source["floor_area_m2"]
        suspended_slab_volume = suspended_floor_area_m2 * 0.125
        acc.add_concrete_mix(suspended_slab_volume, cement_factor, "Suspended slab volume x mix rate", suspended_category,
                             f"Second floor slab {num(suspended_floor_area_m2)} m2 x 0.125 m")
        suspended_bounds = suspended_source.get("floor_bounds")
        if suspended_bounds:
            suspended_len = max(suspended_bounds[2] - suspended_bounds[0], 0.01)
            suspended_wid = max(suspended_bounds[3] - suspended_bounds[1], 0.01)
            rebar_len_count = ceil_int(suspended_len / 0.15) + 1
            rebar_wid_count = ceil_int(suspended_wid / 0.15) + 1
            suspended_slab_rebar_length_m = rebar_len_count * suspended_wid + rebar_wid_count * suspended_len
            suspended_slab_rebar_kg = suspended_slab_rebar_length_m * REBAR_UNIT_WEIGHT_12MM_KG_PER_M
            rebar_weight_by_category[suspended_category] += suspended_slab_rebar_kg
            rebar_steps.append(
                f"Second floor slab, 12mm @ 0.15 m: {rebar_len_count} bars x {num(suspended_wid)} m + {rebar_wid_count} bars x "
                f"{num(suspended_len)} m = {num(suspended_slab_rebar_length_m)} m x 0.889 kg/m = {num(suspended_slab_rebar_kg)} kg")

    # --- Table 14: Column materials -----------------------------------------
    col_w, col_d, _ = default_column_size(storeys)
    col_w = overrides.get("columnWidth", col_w)
    col_d = overrides.get("columnDepth", col_d)
    # Total column height over all floors. Follows floor-to-floor height by default.
    total_col_h = overrides.get("columnHeight", storeys * floor_to_floor_h)

    # (width, depth, height, count) per floor. With a second floor file: one
    # segment per floor, each with its own COLUMN count (ground count if the
    # second file has none), optional 2nd floor size, height split evenly.
    # Single file: one member of total height x ground count.
    if geometry2 is not None:
        segment_h = total_col_h / storeys
        second_count = geometry2["column_count"] or column_count
        col_w2 = overrides.get("columnWidthSecond")
        col_d2 = overrides.get("columnDepthSecond")
        column_floors = [
            (col_w, col_d, segment_h, column_count),
            (col_w if col_w2 is None else col_w2, col_d if col_d2 is None else col_d2, segment_h, second_count),
        ]
    else:
        column_floors = [(col_w, col_d, total_col_h, column_count)]

    column_volume = sum(w * d * h * n for w, d, h, n in column_floors)
    column_parts = ' + '.join(f"{n} x {num(w)} x {num(d)} x {num(h)} m" for w, d, h, n in column_floors)
    acc.add_concrete_mix(column_volume, cement_factor, "Column volume x count (per floor)", "shared",
                         f"Columns ({column_parts})")

    # Column rebar. Diameter is validated (12mm 1-storey, 16mm 2-storey). Bar
    # count is validated only for a bungalow (Reply 3); for 2-storey it depends
    # on the structural design (see the module docstring, docs/nscp-citations.md).
    column_rebar_diameter_mm = COLUMN_REBAR_DIAMETER_MM[2 if storeys >= 2 else 1]
    column_rebar_unit_weight = (
        REBAR_UNIT_WEIGHT_16MM_KG_PER_M if column_rebar_diameter_mm == 16 else REBAR_UNIT_WEIGHT_12MM_KG_PER_M
    )
    column_rebar_length_m = sum(n * COLUMN_REBAR_BAR_COUNT * h for _w, _d, h, n in column_floors)
    column_rebar_kg = column_rebar_length_m * column_rebar_unit_weight
    rebar_weight_by_category["shared"] += column_rebar_kg
    column_bar_parts = ' + '.join(f"{n} columns x {COLUMN_REBAR_BAR_COUNT} bars x {num(h)} m" for _w, _d, h, n in column_floors)
    rebar_steps.append(
        f"Columns, {column_rebar_diameter_mm}mm: {column_bar_parts} = {num(column_rebar_length_m)} m x "
        f"{num(column_rebar_unit_weight, 3)} kg/m = {num(column_rebar_kg)} kg")

    # --- Table 15: Beam materials ------------------------------------------
    beam_w = overrides.get("beamWidth", 0.20)
    beam_d = overrides.get("beamDepth", 0.30)

    # Beam run per floor. A floor with a BEAM layer (Reply 4) uses the drawn
    # beams plus CANTBEAM. A floor without one uses its wall length. Each floor
    # falls back on its own. CANTBEAM only counts with a BEAM layer, since alone
    # it would replace the wall-run estimate with a tiny length.
    def floor_beam_run(g):
        if g["beam_length_m"] > 0:
            return g["beam_length_m"] + g["cantbeam_length_m"], True
        return g["wall_length_m"], False

    ground_run, ground_from_layer = floor_beam_run(geometry)
    if geometry2 is not None:
        second_run, second_from_layer = floor_beam_run(geometry2)
        default_beam_length = ground_run + second_run
        beam_from_layer = ground_from_layer or second_from_layer
    else:
        default_beam_length = ground_run * storeys
        beam_from_layer = ground_from_layer
    beam_length_total = overrides.get("beamLength", default_beam_length)
    beam_volume = beam_w * beam_d * beam_length_total
    if "beamLength" in overrides:
        beam_basis = "Beam volume (beam length override)"
    elif beam_from_layer:
        beam_basis = "Beam volume (from BEAM layer)"
    else:
        beam_basis = "Beam volume (wall-run approximation)"
    beam_source = ('your beam length' if "beamLength" in overrides
                   else 'from the BEAM layer' if beam_from_layer else 'wall length used as beam run')
    acc.add_concrete_mix(beam_volume, cement_factor, beam_basis, "shared",
                         f"Beams {num(beam_w)} x {num(beam_d)} m x {num(beam_length_total)} m ({beam_source})")

    # Beam rebar: no paper formula and no safe NSCP default without f'c/fy
    # (docs/nscp-citations.md). Manual override only: total bar length and size
    # from the user's beam schedule. Zero if not entered. Longitudinal bars only.
    beam_rebar_length_m = overrides.get("beamRebarLength")
    if beam_rebar_length_m:
        # A blank or 0 bar size falls back to 12mm.
        beam_rebar_diameter_mm = overrides.get("beamRebarDiameterMm") or 12
        beam_rebar_kg = beam_rebar_length_m * rebar_unit_weight_kg_per_m(beam_rebar_diameter_mm)
        rebar_weight_by_category["shared"] += beam_rebar_kg
        rebar_steps.append(
            f"Beams, {beam_rebar_diameter_mm}mm (from your beam schedule): {num(beam_rebar_length_m)} m x "
            f"{num(rebar_unit_weight_kg_per_m(beam_rebar_diameter_mm), 3)} kg/m = {num(beam_rebar_kg)} kg")

    # --- Table 16: Roofing materials ----------------------------------------
    # The roof sits on the top floor, so read ROOF from the second floor file if given.
    roof_source = geometry2 if geometry2 is not None else geometry
    roof_floor_area_m2 = roof_source["floor_area_m2"]
    roof_perimeter_m = roof_source["roof_perimeter_m"]
    roof_ridge_length_m = roof_source["roof_ridge_length_m"]

    roof_area_m2 = 0.0
    if include_roofing:
        roof_area_m2 = roof_floor_area_m2 * PITCH_MULTIPLIER * roofing_factor
        sheets = roof_area_m2 / (0.80 * 2.44)
        acc.add("roofingSheets", sheets, "Roof area / sheet coverage", "roofing",
                f"Roof area: {num(roof_floor_area_m2)} m2 top floor x {num(PITCH_MULTIPLIER, 3)} pitch (1:3) x "
                f"{num(roofing_factor)} roofing factor = {num(roof_area_m2)} m2 / (0.80 m x 2.44 m per sheet) = {num(sheets)} sheets")
        purlin_run_m = roof_perimeter_m / 2
        purlins = ceil_int(purlin_run_m / 0.60) + 1
        acc.add("purlins", purlins, "Roof run / purlin spacing", "roofing",
                f"Roof run: {num(roof_perimeter_m)} m roof perimeter / 2 = {num(purlin_run_m)} m / 0.60 m spacing, rounded up, + 1 = {purlins} rows")
        ridge = ceil_int(roof_ridge_length_m / 1.8)
        acc.add("ridge", ridge, "Ridge length / piece length", "roofing",
                f"Ridge length {num(roof_ridge_length_m)} m / 1.8 m per piece, rounded up = {ridge} pieces")
        flashing = ceil_int(roof_perimeter_m / 1.8)
        acc.add("flashing", flashing, "Roof perimeter / piece length", "roofing",
                f"Roof perimeter {num(roof_perimeter_m)} m / 1.8 m per piece, rounded up = {flashing} pieces")
        # Doubled per Engr. Espiritu (Reply 1). The larger size is a catalog
        # matter. Stays a roof-perimeter estimate even with a TRUSS layer,
        # because a plan line is shorter than the real chords and webs.
        angle_pieces = ceil_int(roof_perimeter_m / 6.0)
        acc.add("angleBar", angle_pieces * 2, "Roof perimeter / piece length x 2 (double angle, per engineer)", "roofing",
                f"Roof perimeter {num(roof_perimeter_m)} m / 6 m per piece, rounded up = {angle_pieces} pieces x 2 (double angle) = {angle_pieces * 2} pieces")
        gutter = ceil_int(roof_perimeter_m / 1.8)
        acc.add("gutter", gutter, "Roof eave length / piece length (approximated from roof perimeter)", "roofing",
                f"Eave length taken as the roof perimeter {num(roof_perimeter_m)} m / 1.8 m per piece, rounded up = {gutter} pieces")

    # --- Table 17: Footing materials ----------------------------------------
    footing_w = overrides.get("footingWidth", 0.60)
    footing_l = overrides.get("footingLength", 0.60)
    footing_depth = overrides.get("footingDepth", default_footing_depth(storeys))
    footing_volume = footing_w * footing_l * footing_depth * column_count
    acc.add_concrete_mix(footing_volume, cement_factor, "Footing volume x count", "shared",
                         f"Footings {column_count} x {num(footing_w)} x {num(footing_l)} x {num(footing_depth)} m")

    # --- Table 18: Stair materials (2-storey only) --------------------------
    if storeys >= 2:
        # Table 18: all stair values are tunable (riser, tread, waist thickness,
        # rebar spacing). floor_to_floor_h is reused from Table 12.
        stair_width = overrides.get("stairWidth", 0.90)
        riser_height = overrides.get("riserHeight", 0.18)
        tread_depth = overrides.get("treadDepth", 0.25)
        waist_thickness = overrides.get("waistThickness", 0.15)
        stair_rebar_spacing = overrides.get("stairRebarSpacing", 0.15)
        risers = ceil_int(floor_to_floor_h / riser_height)
        treads = max(risers - 1, 0)
        run = treads * tread_depth
        slant = math.hypot(floor_to_floor_h, run)
        slab_area = slant * stair_width
        slab_volume = slab_area * waist_thickness
        step_volume = 0.5 * riser_height * tread_depth * stair_width * risers
        acc.add_concrete_mix(slab_volume + step_volume, cement_factor, "Stair slab + step volume", "shared",
                             f"Stairs (waist slab {num(slant)} m x {num(stair_width)} m x {num(waist_thickness)} m + "
                             f"{risers} steps x 1/2 x {num(riser_height)} x {num(tread_depth)} x {num(stair_width)} m)")
        # The stair rebar diameter is not in the validation form, so 10mm is our assumption.
        stair_across_bars = ceil_int(slant / stair_rebar_spacing) + 1
        stair_along_bars = ceil_int(stair_width / stair_rebar_spacing) + 1
        stair_rebar_length_m = stair_across_bars * stair_width + stair_along_bars * slant
        stair_rebar_kg = stair_rebar_length_m * REBAR_UNIT_WEIGHT_10MM_KG_PER_M
        rebar_weight_by_category["shared"] += stair_rebar_kg
        rebar_steps.append(
            f"Stairs, 10mm @ {num(stair_rebar_spacing)} m: {stair_across_bars} bars x {num(stair_width)} m + "
            f"{stair_along_bars} bars x {num(slant)} m = {num(stair_rebar_length_m)} m x 0.617 kg/m = {num(stair_rebar_kg)} kg")

    # --- Table 19: Scaffolding & Formwork ------------------------------------
    # Both floors' real areas when a second floor file is given, else floor area x storeys.
    total_floor_area_m2 = floor_area_m2 + geometry2["floor_area_m2"] if geometry2 is not None else floor_area_m2 * storeys

    # Coverage per scaffolding set, 1.8m x 1.2m (Table 19, OK'd in Reply 2). Overridable.
    scaffolding_set_width = overrides.get("scaffoldingSetWidth", 1.8)
    scaffolding_set_height = overrides.get("scaffoldingSetHeight", 1.2)
    building_height = overrides.get("buildingHeight", storeys * floor_to_floor_h)
    # Roofing needs taller scaffolds (Reply 1) but no figure was given, so we add
    # one layer (our assumption), only if roofing is on and height is not overridden.
    if include_roofing and "buildingHeight" not in overrides:
        building_height += scaffolding_set_height
    # Interior scaffolding for roof work follows the truss length (Reply 3). It
    # is 0 when there is no TRUSS layer or roofing is off. The height is our
    # assumption: interior scaffolds stand on the top floor slab, so they span
    # the top storey plus the roofing allowance (4.2m at the defaults). Outside
    # scaffolding uses the full building height.
    truss_run_m = roof_source["truss_length_m"] if include_roofing else 0.0
    interior_scaffold_height = max(building_height - (storeys - 1) * floor_to_floor_h, scaffolding_set_height)
    computed_scaffolding_sets = (
        floor_perimeter_m * building_height + truss_run_m * interior_scaffold_height
    ) / (scaffolding_set_width * scaffolding_set_height)
    # A set-count override (e.g. a contractor quote) skips the formula.
    scaffolding_set_count_override = overrides.get("scaffoldingSetCount")
    if scaffolding_set_count_override is not None:
        scaffold_step = f"Your set count: {num(scaffolding_set_count_override)} sets"
    else:
        height_note = ("your building height" if "buildingHeight" in overrides
                       else f"{storeys} x {num(floor_to_floor_h)} m" + (f" + {num(scaffolding_set_height)} m roofing allowance" if include_roofing else ""))
        truss_part = (f" + truss length {num(truss_run_m)} m x {num(interior_scaffold_height)} m interior height" if truss_run_m > 0 else "")
        scaffold_step = (f"Ground floor perimeter {num(floor_perimeter_m)} m x height {num(building_height)} m ({height_note}){truss_part} "
                         f"= {num(floor_perimeter_m * building_height + truss_run_m * interior_scaffold_height)} m2 / "
                         f"({num(scaffolding_set_width)} m x {num(scaffolding_set_height)} m per set) = {num(computed_scaffolding_sets)} sets")
    acc.add(
        "scaffolding",
        scaffolding_set_count_override if scaffolding_set_count_override is not None else computed_scaffolding_sets,
        "Manual override" if scaffolding_set_count_override is not None
        else "(Perimeter + truss length) x height / coverage" if truss_run_m > 0
        else "Perimeter x height / coverage",
        "shared",
        scaffold_step,
    )
    acc.add("steelProps", total_floor_area_m2 / 1.0, "Slab area / coverage per prop", "shared",
            f"Slab area {num(total_floor_area_m2)} m2 (all floors) / 1.0 m2 per prop = {num(total_floor_area_m2 / 1.0)} props")

    column_formwork_area = sum(2 * (w + d) * h * n for w, d, h, n in column_floors)
    beam_perimeter = 2 * (beam_w + beam_d)
    formwork_area = (
        total_floor_area_m2
        + column_formwork_area
        + (beam_perimeter * beam_length_total)
    )
    # One 1.22m x 2.44m sheet covers 2.98 m2 (Reply 10). Table 19 said 1 sheet
    # per 1.22 m2, which contradicts its own sheet size. The 5-10% cutting
    # allowance is the wastage multiplier applied below, so it is not added here.
    formwork_text = (f"Formwork area: slabs {num(total_floor_area_m2)} m2 + column sides {num(column_formwork_area)} m2 + "
                     f"beam sides and bottom {num(beam_perimeter)} m x {num(beam_length_total)} m = {num(formwork_area)} m2")
    plywood = formwork_area / (1.22 * 2.44)
    lumber = formwork_area * 3
    acc.add("plywood", plywood, "Formwork area / sheet coverage (2.98 m2 per sheet)", "shared", formwork_text)
    acc.steps["plywood"].append(f"{num(formwork_area)} m2 / 2.98 m2 per sheet (1.22 m x 2.44 m) = {num(plywood)} sheets")
    acc.add("lumber", lumber, "Formwork area x board-feet ratio", "shared", formwork_text)
    acc.steps["lumber"].append(f"{num(formwork_area)} m2 x 3 bd.ft. per m2 = {num(lumber)} bd.ft.")

    # --- Reinforcement rollup (rebar and tie wire) ---
    # Computed per category so each breakdown is correct. Weight already uses
    # each diameter, so only the Steel Factor is applied here.
    for category, weight_kg in rebar_weight_by_category.items():
        if weight_kg <= 0:
            continue
        adjusted_weight_kg = weight_kg * steel_factor
        acc.add("steelRebar", adjusted_weight_kg / 1000, "Reinforcement length x unit weight", category)
        acc.add("tieWire", adjusted_weight_kg / 100, "Rebar weight x tie-wire ratio", category)
    total_rebar_kg = sum(rebar_weight_by_category.values())
    if total_rebar_kg > 0:
        adjusted_total_kg = total_rebar_kg * steel_factor
        acc.steps["steelRebar"] = rebar_steps + [
            f"Total {num(total_rebar_kg)} kg x {num(steel_factor)} steel factor = {num(adjusted_total_kg)} kg / 1,000 = {num(adjusted_total_kg / 1000, 3)} tons"]
        acc.steps["tieWire"] = [f"Rebar {num(adjusted_total_kg)} kg x 1 kg of tie wire per 100 kg = {num(adjusted_total_kg / 100)} kg"]

    # Wastage applies to items prone to cut or spill loss. CHB already has 5%
    # (Table 12); rebar and tie wire use the Steel Factor instead.
    wastage_keys = {"cement", "sand", "gravel", "roofingSheets", "purlins", "ridge",
                     "flashing", "angleBar", "gutter", "plywood", "lumber", "steelProps", "scaffolding"}
    for key in wastage_keys:
        if key in acc.totals:
            before_wastage = acc.totals[key]
            acc.totals[key] *= wastage_multiplier
            for category in acc.by_category[key]:
                acc.by_category[key][category] *= wastage_multiplier
            acc.steps.setdefault(key, []).append(
                f"Subtotal {num(before_wastage, 3)} x {num(wastage_multiplier)} ({num((wastage_multiplier - 1) * 100, 0)}% wastage) = {num(acc.totals[key], 3)}")

    material_meta = {
        "hollowBlocks": ("CHB (Concrete Hollow Blocks)", "pcs"),
        "cement": ("Cement", "bags"),
        "sand": ("Sand", "m3"),
        "gravel": ("Gravel", "m3"),
        "steelRebar": ("Rebar", "tons"),
        "tieWire": ("Tie Wire", "kg"),
        "roofingSheets": ("Roofing", "sheets"),
        "purlins": ("Purlins", "lengths"),
        "ridge": ("Ridge", "lengths"),
        "flashing": ("Flashing", "pcs"),
        "angleBar": ("Angle Bar", "lengths"),
        "gutter": ("Gutter", "pcs"),
        "plywood": ("Plywood", "pcs"),
        "lumber": ("Lumber", "bd.ft."),
        "steelProps": ("Steel Props", "pcs"),
        "scaffolding": ("Scaffolding", "sets"),
    }

    materials = []
    for key, (name, unit) in material_meta.items():
        if key in ("roofingSheets", "purlins", "ridge", "flashing", "angleBar", "gutter") and not include_roofing:
            continue
        raw_qty = acc.totals.get(key, 0.0)
        if unit not in WHOLE_UNITS and unit not in FRACTIONAL_UNITS:
            raise ValueError(
                f"Material '{key}' uses unit '{unit}', which isn't listed in WHOLE_UNITS or "
                f"FRACTIONAL_UNITS — decide how it rounds before adding it."
            )
        qty = ceil_int(raw_qty) if unit in WHOLE_UNITS else round(raw_qty, 3)
        # Category subtotals are plain-rounded to 3 decimals. Ceiling each one
        # could overshoot the rounded total, so they may not sum exactly to qty.
        source_breakdown = {
            category: round(acc.by_category.get(key, {}).get(category, 0.0), 3)
            for category in SOURCE_CATEGORIES
        }
        steps = list(acc.steps.get(key, []))
        if len(steps) > 1 and key not in wastage_keys and key not in ("steelRebar", "tieWire"):
            steps.append(f"Total {num(raw_qty, 3)}")
        steps.append(f"Rounded up: {qty:,} {unit}" if unit in WHOLE_UNITS else f"Result: {num(qty, 3)} {unit}")
        materials.append({
            "key": key,
            "name": name,
            "quantity": qty,
            "unit": unit,
            "basis": acc.bases.get(key, ""),
            "sourceBreakdown": source_breakdown,
            "steps": steps,
        })

    # Per-floor measurements follow the same rule as floorArea: sum both files
    # if a second floor was given, else scale the one file by storeys. This
    # covers walls, door/window openings and floor perimeter.
    #
    # Not scaled: column_count (ground floor count, saved to one DB column and
    # used for footings) and roof_perimeter_m / roof_ridge_length_m (there is
    # only one roof, from roof_source).
    def _combine(ground_value, key):
        if geometry2 is not None:
            return ground_value + geometry2[key]
        return ground_value * storeys

    total_wall_length_m = _combine(wall_length_m, "wall_length_m")
    total_door_area_m2 = _combine(door_area_m2, "door_area_m2")
    total_window_area_m2 = _combine(window_area_m2, "window_area_m2")
    total_floor_perimeter_m = _combine(floor_perimeter_m, "floor_perimeter_m")
    total_rooms_detected = _combine(geometry["rooms_detected"], "rooms_detected")

    measurements = {
        "totalWallLength": round(total_wall_length_m, 2),
        "floorArea": round(total_floor_area_m2, 2),
        "roofArea": round(roof_area_m2, 2),
        "roomsDetected": total_rooms_detected,
        "doorArea": round(total_door_area_m2, 2),
        "windowArea": round(total_window_area_m2, 2),
        # columnCount is the count the take-off used (saved to
        # estimation_results.column_count). The two below add what the DXF
        # had (None if no COLUMN layer) and whether the count came from the
        # drawing, an override, or our default.
        "columnCount": column_count,
        "columnCountDetected": detected_column_count or None,
        "columnCountSource": column_count_source,
        "floorPerimeter": round(total_floor_perimeter_m, 2),
        "roofPerimeter": round(roof_perimeter_m, 2),
        "roofRidgeLength": round(roof_ridge_length_m, 2),
    }
    if geometry2 is not None:
        # Per-floor breakdown, only when a second floor file was given. With
        # one file, ground and total are the same number.
        measurements["groundFloor"] = {
            "wallLength": round(geometry["wall_length_m"], 2),
            "floorArea": round(geometry["floor_area_m2"], 2),
        }
        measurements["secondFloor"] = {
            "wallLength": round(geometry2["wall_length_m"], 2),
            "floorArea": round(geometry2["floor_area_m2"], 2),
        }

    return {
        "measurements": measurements,
        "materials": materials,
    }

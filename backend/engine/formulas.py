"""
Quantity take-off for the capstone paper's Tables 12-19 (wall, slab, column,
beam, roofing, footing, stair, scaffolding and formwork). Uses the geometry
from dxf_reader.py and returns quantities for the 16 material keys the
frontend uses (see parsedProjectCache.js).

Inputs a 2D DXF can't give (beam size, floor-to-floor height, building
height) are optional overrides with the paper's default values, as the
paper's Estimation Calibration Settings intends (Section 4.3.3.2).

A 2-storey project has one file per floor (geometry2), so each floor uses its
own walls, slab, columns and roof. Projects saved before that rule may still
have one file, and then the ground floor is reused. One file is always read as
one floor (docs/paper-limitations.md entry 1).

Sources, newest first: the engineer's handwritten sheet and truss formula
(2026-10-04: footing, column and beam rebar by weight, form areas, truss angle
bar), the 2026-10-03 meeting, Max Fajardo's Simplified Construction Estimate
(the engineers' reference: mortar, wall rebar, tie wire, roof sheets, roof
pieces, frame lumber), Engr. Espiritu's replies, the paper.

Assumptions (ours unless a source is named):
  - Rebar: 10mm for walls and ground slab, 12mm for the 2nd floor slab
    (validation form). Stairs use 10mm (ours). Bar sizes stop at 16mm. The
    CHB wall bar size can be changed (wallBarMm), since the engineer's
    2026-10-09 sheets use 12mm.
  - Column rebar is 180 kg per m3 of column concrete and beam rebar 160,
    each half main bars and half ties or stirrups (engineer). The main bar
    and tie sizes (default 16mm and 10mm) only split each half into lengths.
    Bars are not counted from the plan (the engineer, 2026-10-05).
  - Footing rebar is 100 kg per m3 of 16mm (engineer). Footing concrete uses
    the footing thickness (0.30 m, ours). Footing plan size defaults to
    0.60m x 0.60m (ours).
  - Columns are per floor when a second floor file is given (Reply 2), the
    total height split evenly (ours). Each ground floor column also has a
    part below ground, footing depth minus footing thickness, with the
    ground column size (the engineer's sheets, 2026-10-09). Footing depth
    defaults to 1.5 m for 1 storey and 2.0 m for 2 (the paper). The 2-storey 0.25 m size is an
    editable placeholder, not validated.
  - Tie length is 2(a + b) - 8 x 0.04 m cover + 2 x 0.06 m hooks, which gives
    Fajardo's 1.80 m tie for a 0.50 m column. Tie wire for bars with no
    crossings to count (footings, beam main bars) is 1 kg per 100 kg (ours).
  - Angle bar is roof area x framing weight (17.5 kg per m2) / angle bar
    weight (3.4 kg per m) / 6 m (engineer), plus the general wastage. The TRUSS layer only
    adds interior scaffolding, at the top storey plus the roofing allowance
    (4.2m at the defaults, ours). Roofing adds one 1.2 m scaffold layer (ours).
  - Beam length comes from the BEAM layer (plus CANTBEAM) when a floor has
    one (Reply 4), otherwise that floor's wall length. The ground (footing
    tie) beam is extra: its length is entered, or read from the ground
    floor's FTBEAM layer, else 0. Same size as the other beams (the
    engineer's sheets, 2026-10-09).
  - Purlin run is half the roof perimeter and gutter length the roof
    perimeter (ours). Hip rolls are not counted.
  - Form areas follow the engineer: columns (W + L) x 2 x H, beams
    (W + 2D) x L, footings (W + L) x 2 x T, slabs their floor area. Slab forms
    get no frame lumber, since the steel props support them.
  - Formwork is a one-time purchase of the full quantity (Table 19, a local
    civil engineer 2026-09-07). Reuse is a price option in
    optimization.service.js (formwork 1 to 3 uses, scaffolding 4 by default),
    which also lists lumber in whole pieces and rebar in 6 m bars.
"""
import math

from member_sheets import build_member_sheets

WALL_HEIGHT_PER_STOREY_M = 3.0
# Fallback only. floorToFloorHeight is the ground floor height and
# secondFloorHeight the second floor's (same as the ground floor if blank).
# They set the walls, column heights, stairs and scaffolding height.
# What one scaffolding set holds, from the engineer's example (2026-10-04
# meeting). Shown in the steps only; the count is still in sets.
SCAFFOLD_SET_PARTS = "2 H-frames, 2 cross braces and 4 joint pins"
# Used only when the DXF has no COLUMN layer. It is not an override key.
DEFAULT_COLUMN_COUNT = 4
# Bar weight in kg/m = d^2/162 (d in mm), from the PNS/DPWH table. 10mm for
# walls and ground slab, 12mm for the 2nd floor slab (Engr. Espiritu).
REBAR_UNIT_WEIGHT_10MM_KG_PER_M = 0.617
REBAR_UNIT_WEIGHT_12MM_KG_PER_M = 0.889
# 16mm, same formula. Used for 2-storey column rebar (validated diameter).
REBAR_UNIT_WEIGHT_16MM_KG_PER_M = 1.580

# Main bars per column for the column tie wire (NSCP minimum of 4,
# docs/nscp-citations.md).
COLUMN_REBAR_BAR_COUNT = 4

# NSCP 2016 moderate slope, rise:run = 1:3 -> sqrt(rise^2 + run^2) / run = sqrt(10) / 3
PITCH_MULTIPLIER = math.sqrt(10) / 3

# Values from Max Fajardo's Simplified Construction Estimate, the reference
# the engineers use (docs/fajardo-comparison.md). They replace our paper's
# values where the two differed.
# CHB laying mortar, class B: (bags cement, m3 sand) per m2 (Table 2-2).
MORTAR_PER_M2 = {'4"': (0.522, 0.0435), '6"': (1.018, 0.0844)}
# 10mm CHB bars per m2 of wall, hooks and laps included (Table 3-5).
WALL_REBAR_VERTICAL_M_PER_M2 = 2.13    # vertical @ 0.60 m
WALL_REBAR_HORIZONTAL_M_PER_M2 = 2.15  # horizontal every 3 layers
# No. 16 tie wire. Walls: kg per m2 at those spacings, 30 cm ties (Table 3-6).
# Grids: one 30 cm tie per crossing (p. 110). Column ties: 40 cm per bar
# (Illustration 3-9). One kg is about 53 m.
WALL_TIE_WIRE_KG_PER_M2 = 0.032
GRID_TIE_LENGTH_M = 0.30
COLUMN_TIE_WIRE_LENGTH_M = 0.40
TIE_WIRE_M_PER_KG = 53
# One tie or stirrup length: cover is NSCP's 40mm for columns. The 0.06 m
# hook is ours, set so a 0.50 m column gives Fajardo's 1.80 m tie (p. 116:
# 4 x 0.42 + 2 x 0.06).
# Footing rebar by weight per m3 of footing concrete, 16mm bars (the engineers,
# 2026-10-03 meeting). Rebar is bought in 6 m lengths (same meeting).
FOOTING_REBAR_KG_PER_M3 = 100
# Rebar by weight per m3 of concrete, from the engineer's handwritten sheet
# (2026-10-04): columns 180, beams 160, each half 16mm main bars and half 10mm
# ties or stirrups. Used unless bars are entered from the plan.
COLUMN_REBAR_KG_PER_M3 = 180
BEAM_REBAR_KG_PER_M3 = 160
RATIO_MAIN_BAR_SHARE = 0.5
RATIO_MAIN_BAR_MM = 16
RATIO_TIE_BAR_MM = 10
# Truss angle bar by weight (the engineer, 2026-10-04): framing weight per m2
# of roof, angle bar weight per meter (1/4" x 1.5" x 1.5", as in the catalog),
# 6 m bars. Cutting waste is the general wastage.
TRUSS_FRAMING_KG_PER_M2 = 17.5
ANGLE_BAR_KG_PER_M = 3.4
ANGLE_BAR_LENGTH_M = 6.0
# Footing pad thickness, and how deep the footing sits below ground (the
# paper: 1.5 m for 1 storey, 2.0 m for 2). The column part below ground is
# depth minus thickness.
DEFAULT_FOOTING_THICKNESS_M = 0.30
DEFAULT_FOOTING_DEPTH_M = {1: 1.5, 2: 2.0}
REBAR_BAR_LENGTH_M = 6.0
COLUMN_COVER_M = 0.04
TIE_HOOK_M = 0.06
# Corrugated G.I. sheet, 8 ft (Table 6-2): 0.70 m effective width at 1 1/2
# corrugation side lap, 25-30 cm end lap (30 cm as in Illustration 6-1),
# purlins at 0.70 m for this length.
ROOF_SHEET_EFFECTIVE_WIDTH_M = 0.70
ROOF_SHEET_LENGTH_M = 2.44
ROOF_SHEET_END_LAP_M = 0.30
PURLIN_SPACING_M = 0.70
# Length per piece. Ridge roll, flashing and gutter come in 2.4 m pieces,
# the normal size (the engineer, 2026-10-10). Was Fajardo Table 6-6's
# effective lengths of 2.20 / 2.30 / 2.35 m.
ROOF_ACCESSORY_LENGTH_M = {"gutter": 2.40, "flashing": 2.40, "ridge": 2.40}
# Frame lumber (Table 5-1): 2" x 2" frame per 2.88 m2 plywood form.
FAJARDO_FORM_SHEET_M2 = 2.88
COLUMN_FORM_BDFT_PER_SHEET = 29.67
BEAM_FORM_BDFT_PER_SHEET = 25.06

# Countable items are rounded up (Tables 12-19), since you can't buy part of a
# bag or sheet. Only bulk units (volume, weight) stay fractional. A unit in
# neither list raises an error below, so it can't silently stay fractional.
WHOLE_UNITS = ("pcs", "sheets", "lengths", "sets", "bd.ft.", "bags")
FRACTIONAL_UNITS = ("m3", "tons", "kg")


def ceil_int(value):
    return int(math.ceil(value)) if value > 0 else 0


def default_column_size(storeys):
    return (0.25, 0.25, 6.0) if storeys >= 2 else (0.20, 0.20, 3.0)


def bar_unit_weight(diameter_mm):
    """kg/m for a bar size: the table values for 10/12/16mm, else d^2/162."""
    return {10: REBAR_UNIT_WEIGHT_10MM_KG_PER_M, 12: REBAR_UNIT_WEIGHT_12MM_KG_PER_M,
            16: REBAR_UNIT_WEIGHT_16MM_KG_PER_M}.get(diameter_mm, (diameter_mm ** 2) / 162)


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
    # Tie wire is counted from the bars (Fajardo Sec. 3-5), not as a share of rebar weight.
    tie_wire_by_category = {category: 0.0 for category in SOURCE_CATEGORIES}
    tie_wire_steps = []
    # Bar length per size, so the BOM can list rebar as 6 m pieces.
    bar_length_by_diameter = {}

    def add_bar_length(diameter_mm, length_m):
        bar_length_by_diameter[diameter_mm] = bar_length_by_diameter.get(diameter_mm, 0.0) + length_m

    def add_grid_tie_wire(bars_a, bars_b, label, category):
        # One tie at every crossing of a bar grid (Fajardo p. 110).
        crossings = bars_a * bars_b
        kg = crossings * GRID_TIE_LENGTH_M / TIE_WIRE_M_PER_KG
        tie_wire_by_category[category] += kg
        tie_wire_steps.append(
            f"{label}: {bars_a} x {bars_b} = {crossings:,} crossings x {GRID_TIE_LENGTH_M} m / "
            f"{TIE_WIRE_M_PER_KG} m per kg = {num(kg)} kg")

    # --- Table 12: Wall materials -----------------------------------------
    # Height of each floor (the engineer: e.g. 5 m ground floor, 4 m second
    # floor). floor_to_floor_h is the ground floor; the stair runs up it.
    floor_to_floor_h = overrides.get("floorToFloorHeight", WALL_HEIGHT_PER_STOREY_M)
    second_floor_h = overrides.get("secondFloorHeight", floor_to_floor_h)
    floor_heights = [floor_to_floor_h] + [second_floor_h] * (storeys - 1)

    # With a second floor file, storey 2 uses its own walls and openings.
    # Otherwise the ground floor geometry is reused for every storey.
    floor_geometries = [geometry, geometry2] if geometry2 is not None else [geometry]
    member_walls = []  # per floor, for the "By member" breakdown
    for storey in range(storeys):
        storey_geometry = floor_geometries[storey] if storey < len(floor_geometries) else floor_geometries[-1]
        storey_category = "second" if storey_geometry is geometry2 else "ground"
        storey_wall_length_m = storey_geometry["wall_length_m"]
        storey_door_area_m2 = storey_geometry["door_area_m2"]
        storey_window_area_m2 = storey_geometry["window_area_m2"]

        storey_h = floor_heights[storey]
        gross_wall_area = storey_wall_length_m * storey_h
        net_wall_area = max(gross_wall_area - storey_door_area_m2 - storey_window_area_m2, 0.0)
        floor_label = 'Ground floor' if storey == 0 else ('Second floor' if storey_geometry is geometry2 else 'Second floor (ground plan reused)')
        wall_text = (f"{floor_label} walls: {num(storey_wall_length_m)} m x {num(storey_h)} m - "
                     f"{num(storey_door_area_m2)} m2 doors - {num(storey_window_area_m2)} m2 windows = {num(net_wall_area)} m2")

        chb = net_wall_area * 12.5 * 1.05
        acc.add("hollowBlocks", chb, "Wall area / coverage", storey_category,
                f"{wall_text} x 12.5 pcs per m2 x 1.05 = {num(chb)} pcs")

        # Mortar per CHB size (Fajardo Table 2-2, class B). The wall area is
        # split by how much of the floor's wall run is 6" thick.
        six_inch_share = (storey_geometry.get("six_inch_wall_length_m", 0.0) / storey_wall_length_m
                          if storey_wall_length_m > 0 else 0.0)
        mortar_parts = []
        for chb_size, share in (('4"', 1 - six_inch_share), ('6"', six_inch_share)):
            area = net_wall_area * share
            if area <= 0:
                continue
            bags_per_m2, sand_per_m2 = MORTAR_PER_M2[chb_size]
            mortar_parts.append((chb_size, area, bags_per_m2, sand_per_m2))
            mortar_cement = area * bags_per_m2 * cement_factor
            mortar_sand = area * sand_per_m2
            acc.add("cement", mortar_cement, "Wall area x mortar rate", storey_category,
                    f"{floor_label} {chb_size} CHB mortar: {num(area)} m2 x {bags_per_m2} bags per m2 x "
                    f"{num(cement_factor)} cement factor = {num(mortar_cement)} bags")
            acc.add("sand", mortar_sand, "Wall area x mortar rate", storey_category,
                    f"{floor_label} {chb_size} CHB mortar: {num(area)} m2 x {sand_per_m2} m3 per m2 = {num(mortar_sand, 3)} m3")

        # Fajardo Table 3-5: vertical @ 0.60 m and horizontal every 3 layers,
        # per m2 of wall, hooks and laps included. 10mm unless changed.
        wall_bar_mm = int(overrides.get("wallBarMm") or 10)
        wall_rebar_length_m = net_wall_area * (WALL_REBAR_VERTICAL_M_PER_M2 + WALL_REBAR_HORIZONTAL_M_PER_M2)
        wall_rebar_kg = wall_rebar_length_m * bar_unit_weight(wall_bar_mm)
        rebar_weight_by_category[storey_category] += wall_rebar_kg
        add_bar_length(wall_bar_mm, wall_rebar_length_m)
        rebar_steps.append(
            f"{floor_label} walls, {wall_bar_mm}mm: {num(net_wall_area)} m2 x "
            f"({WALL_REBAR_VERTICAL_M_PER_M2} + {WALL_REBAR_HORIZONTAL_M_PER_M2}) m per m2 = "
            f"{num(wall_rebar_length_m)} m x {num(bar_unit_weight(wall_bar_mm), 3)} kg/m = {num(wall_rebar_kg)} kg")
        member_walls.append({"label": floor_label, "length": storey_wall_length_m, "height": storey_h,
                             "doors": storey_door_area_m2, "windows": storey_window_area_m2, "area": net_wall_area,
                             "mortar": mortar_parts, "bar_mm": wall_bar_mm})
        wall_tie_wire_kg = net_wall_area * WALL_TIE_WIRE_KG_PER_M2
        tie_wire_by_category[storey_category] += wall_tie_wire_kg
        tie_wire_steps.append(
            f"{floor_label} walls: {num(net_wall_area)} m2 x {WALL_TIE_WIRE_KG_PER_M2} kg per m2 = {num(wall_tie_wire_kg)} kg")

    # --- Table 13: Slab materials ------------------------------------------
    ground_slab_volume = floor_area_m2 * 0.15
    acc.add_concrete_mix(ground_slab_volume, cement_factor, "Ground slab volume x mix rate", "ground",
                         f"Ground slab {num(floor_area_m2)} m2 x 0.15 m")
    member_slabs = []
    ground_bars = None
    bounds = geometry.get("floor_bounds")
    if bounds:
        floor_len = max(bounds[2] - bounds[0], 0.01)
        floor_wid = max(bounds[3] - bounds[1], 0.01)
        # Bar size and spacing can come from the plan (engineers, 2026-10-03).
        ground_bar_mm = overrides.get("groundSlabBarMm", 10)
        ground_spacing = overrides.get("groundSlabBarSpacing", 0.30)
        rebar_len_count = ceil_int(floor_len / ground_spacing) + 1
        rebar_wid_count = ceil_int(floor_wid / ground_spacing) + 1
        ground_slab_rebar_length_m = rebar_len_count * floor_wid + rebar_wid_count * floor_len
        ground_slab_rebar_kg = ground_slab_rebar_length_m * bar_unit_weight(ground_bar_mm)
        rebar_weight_by_category["ground"] += ground_slab_rebar_kg
        add_bar_length(ground_bar_mm, ground_slab_rebar_length_m)
        rebar_steps.append(
            f"Ground slab, {ground_bar_mm}mm @ {num(ground_spacing)} m: {rebar_len_count} bars x {num(floor_wid)} m + {rebar_wid_count} bars x "
            f"{num(floor_len)} m = {num(ground_slab_rebar_length_m)} m x {num(bar_unit_weight(ground_bar_mm), 3)} kg/m = {num(ground_slab_rebar_kg)} kg")
        add_grid_tie_wire(rebar_len_count, rebar_wid_count, "Ground slab", "ground")
        ground_bars = (ground_bar_mm, ground_spacing, rebar_len_count, floor_wid, rebar_wid_count, floor_len, ground_slab_rebar_length_m)
    member_slabs.append({"label": "Ground slab", "area": floor_area_m2, "t": 0.15, "bars": ground_bars})

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
        suspended_bars = None
        suspended_bounds = suspended_source.get("floor_bounds")
        if suspended_bounds:
            suspended_len = max(suspended_bounds[2] - suspended_bounds[0], 0.01)
            suspended_wid = max(suspended_bounds[3] - suspended_bounds[1], 0.01)
            second_bar_mm = overrides.get("secondSlabBarMm", 12)
            second_spacing = overrides.get("secondSlabBarSpacing", 0.15)
            rebar_len_count = ceil_int(suspended_len / second_spacing) + 1
            rebar_wid_count = ceil_int(suspended_wid / second_spacing) + 1
            suspended_slab_rebar_length_m = rebar_len_count * suspended_wid + rebar_wid_count * suspended_len
            suspended_slab_rebar_kg = suspended_slab_rebar_length_m * bar_unit_weight(second_bar_mm)
            rebar_weight_by_category[suspended_category] += suspended_slab_rebar_kg
            add_bar_length(second_bar_mm, suspended_slab_rebar_length_m)
            rebar_steps.append(
                f"Second floor slab, {second_bar_mm}mm @ {num(second_spacing)} m: {rebar_len_count} bars x {num(suspended_wid)} m + {rebar_wid_count} bars x "
                f"{num(suspended_len)} m = {num(suspended_slab_rebar_length_m)} m x {num(bar_unit_weight(second_bar_mm), 3)} kg/m = {num(suspended_slab_rebar_kg)} kg")
            add_grid_tie_wire(rebar_len_count, rebar_wid_count, "Second floor slab", suspended_category)
            suspended_bars = (second_bar_mm, second_spacing, rebar_len_count, suspended_wid, rebar_wid_count, suspended_len, suspended_slab_rebar_length_m)
        member_slabs.append({"label": "2nd floor slab", "area": suspended_floor_area_m2, "t": 0.125, "bars": suspended_bars})

    # --- Table 14: Column materials -----------------------------------------
    col_w, col_d, _ = default_column_size(storeys)
    col_w = overrides.get("columnWidth", col_w)
    col_d = overrides.get("columnDepth", col_d)
    # Total column height over all floors. Follows the floor heights by default.
    total_col_h = overrides.get("columnHeight", sum(floor_heights))

    # (width, depth, height, count) per floor. With a second floor file: one
    # segment per floor, each with its own COLUMN count (ground count if the
    # second file has none), optional 2nd floor size, each floor's own height
    # (a Column height override is split in the same proportion).
    # Single file: one member of total height x ground count.
    if geometry2 is not None:
        segment_hs = [total_col_h * h / sum(floor_heights) for h in floor_heights]
        second_count = geometry2["column_count"] or column_count
        col_w2 = overrides.get("columnWidthSecond")
        col_d2 = overrides.get("columnDepthSecond")
        column_floors = [
            (col_w, col_d, segment_hs[0], column_count),
            (col_w if col_w2 is None else col_w2, col_d if col_d2 is None else col_d2, segment_hs[1], second_count),
        ]
    else:
        column_floors = [(col_w, col_d, total_col_h, column_count)]

    # Part below ground: from the footing up to the ground floor, footing
    # depth minus footing thickness, one per ground column (the engineer's
    # sheets, 2026-10-09). Same size as the ground floor columns.
    footing_depth = overrides.get("footingDepth", DEFAULT_FOOTING_DEPTH_M[2 if storeys >= 2 else 1])
    below_ground_h = max(footing_depth - overrides.get("footingThickness", DEFAULT_FOOTING_THICKNESS_M), 0.0)
    if below_ground_h > 0 and column_count > 0:
        column_floors.insert(0, (col_w, col_d, below_ground_h, column_count))

    column_volume = sum(w * d * h * n for w, d, h, n in column_floors)
    column_parts = ' + '.join(f"{n} x {num(w)} x {num(d)} x {num(h)} m" for w, d, h, n in column_floors)
    if below_ground_h > 0 and column_count > 0:
        column_parts += f', the first below ground ({num(footing_depth)} m footing depth minus footing thickness)'
    acc.add_concrete_mix(column_volume, cement_factor, "Column volume x count", "shared",
                         f"Columns ({column_parts})")

    # Column rebar by weight (the engineer, 2026-10-04): 180 kg per m3 of
    # column concrete, half main bars and half lateral ties. The bar sizes
    # (default 16mm and 10mm) only turn each half into a length.
    column_rate = overrides.get("columnRebarKgPerM3", COLUMN_REBAR_KG_PER_M3)
    column_main_mm = int(overrides.get("columnBarMm") or RATIO_MAIN_BAR_MM)
    column_tie_mm = int(overrides.get("columnTieMm") or RATIO_TIE_BAR_MM)
    column_rebar_kg = column_volume * column_rate
    main_kg = column_rebar_kg * RATIO_MAIN_BAR_SHARE
    tie_kg = column_rebar_kg - main_kg
    main_m = main_kg / bar_unit_weight(column_main_mm)
    tie_m = tie_kg / bar_unit_weight(column_tie_mm)
    rebar_weight_by_category["shared"] += column_rebar_kg
    add_bar_length(column_main_mm, main_m)
    add_bar_length(column_tie_mm, tie_m)
    rebar_steps.append(
        f"Columns: {num(column_volume, 3)} m3 x {num(column_rate)} kg per m3 = {num(column_rebar_kg)} kg, "
        f"half {column_main_mm}mm main bars ({num(main_kg)} kg = {num(main_m)} m) and half "
        f"{column_tie_mm}mm ties ({num(tie_kg)} kg = {num(tie_m)} m)")
    # Tie wire from the number of ties this length makes, 0.40 m per main bar.
    w0, d0 = column_floors[0][0], column_floors[0][1]
    one_tie_m = 2 * (w0 + d0) - 8 * COLUMN_COVER_M + 2 * TIE_HOOK_M
    tie_count = ceil_int(tie_m / one_tie_m)
    column_tie_wire_kg = tie_count * COLUMN_REBAR_BAR_COUNT * COLUMN_TIE_WIRE_LENGTH_M / TIE_WIRE_M_PER_KG
    tie_wire_by_category["shared"] += column_tie_wire_kg
    tie_wire_steps.append(
        f"Column ties: {num(tie_m)} m / {num(one_tie_m)} m per tie = {tie_count:,} ties x {COLUMN_REBAR_BAR_COUNT} bars x "
        f"{COLUMN_TIE_WIRE_LENGTH_M} m / {TIE_WIRE_M_PER_KG} m per kg = {num(column_tie_wire_kg)} kg")

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
    floor_beam_length = overrides.get("beamLength", default_beam_length)
    # Ground (footing tie) beam, same size as the other beams (the engineer's
    # sheets, 2026-10-09). Entered, or the ground floor's FTBEAM layer, else 0.
    ground_beam_length = overrides.get("groundBeamLength", geometry.get("ftbeam_length_m", 0.0))
    beam_length_total = floor_beam_length + ground_beam_length
    beam_volume = beam_w * beam_d * beam_length_total
    if "beamLength" in overrides:
        beam_basis = "Beam volume (beam length override)"
    elif beam_from_layer:
        beam_basis = "Beam volume (from BEAM layer)"
    else:
        beam_basis = "Beam volume (wall-run approximation)"
    beam_source = ('your beam length' if "beamLength" in overrides
                   else 'from the BEAM layer' if beam_from_layer else 'wall length used as beam run')
    if ground_beam_length > 0:
        ground_source = 'entered' if "groundBeamLength" in overrides else 'FTBEAM layer'
        beam_source = (f"{num(floor_beam_length)} m floor beams, {beam_source}, + "
                       f"{num(ground_beam_length)} m ground beam, {ground_source}")
    acc.add_concrete_mix(beam_volume, cement_factor, beam_basis, "shared",
                         f"Beams {num(beam_w)} x {num(beam_d)} m x {num(beam_length_total)} m ({beam_source})")

    # Beam rebar by weight (the engineer, 2026-10-04): 160 kg per m3 of beam
    # concrete, half main bars and half stirrups. The bar sizes (default 16mm
    # and 10mm) only turn each half into a length.
    beam_rate = overrides.get("beamRebarKgPerM3", BEAM_REBAR_KG_PER_M3)
    beam_main_mm = int(overrides.get("beamRebarDiameterMm") or RATIO_MAIN_BAR_MM)
    stirrup_mm = int(overrides.get("beamStirrupMm") or RATIO_TIE_BAR_MM)
    beam_ratio_kg = beam_volume * beam_rate
    beam_main_kg = beam_ratio_kg * RATIO_MAIN_BAR_SHARE
    beam_main_m = beam_main_kg / bar_unit_weight(beam_main_mm)
    add_bar_length(beam_main_mm, beam_main_m)
    rebar_steps.append(
        f"Beam main bars: {num(beam_volume, 3)} m3 x {num(beam_rate)} kg per m3 x half = {num(beam_main_kg)} kg "
        f"of {beam_main_mm}mm = {num(beam_main_m)} m")
    rebar_weight_by_category["shared"] += beam_main_kg
    # No bar crossings to count for main bars, so 1 kg of tie wire per 100 kg (our assumption).
    beam_tie_wire_kg = beam_main_kg / 100
    tie_wire_by_category["shared"] += beam_tie_wire_kg
    tie_wire_steps.append(f"Beam main bars: {num(beam_main_kg)} kg x 1 kg per 100 kg = {num(beam_tie_wire_kg)} kg")

    # Stirrup length uses the same cover and hooks as column ties. Tie wire:
    # 4 corner bars per stirrup, 0.40 m each.
    one_stirrup_m = 2 * (beam_w + beam_d) - 8 * COLUMN_COVER_M + 2 * TIE_HOOK_M
    stirrup_kg = beam_ratio_kg - beam_main_kg
    stirrup_length_m = stirrup_kg / bar_unit_weight(stirrup_mm)
    stirrups = ceil_int(stirrup_length_m / one_stirrup_m)
    rebar_steps.append(
        f"Beam stirrups: {num(beam_volume, 3)} m3 x {num(beam_rate)} kg per m3 x half = {num(stirrup_kg)} kg "
        f"of {stirrup_mm}mm = {num(stirrup_length_m)} m")
    rebar_weight_by_category["shared"] += stirrup_kg
    add_bar_length(stirrup_mm, stirrup_length_m)
    stirrup_tie_wire_kg = stirrups * 4 * COLUMN_TIE_WIRE_LENGTH_M / TIE_WIRE_M_PER_KG
    tie_wire_by_category["shared"] += stirrup_tie_wire_kg
    tie_wire_steps.append(
        f"Beam stirrups: {stirrups:,} stirrups x 4 corner bars x {COLUMN_TIE_WIRE_LENGTH_M} m / "
        f"{TIE_WIRE_M_PER_KG} m per kg = {num(stirrup_tie_wire_kg)} kg")

    # --- Table 16: Roofing materials ----------------------------------------
    # The roof sits on the top floor, so read ROOF from the second floor file if given.
    roof_source = geometry2 if geometry2 is not None else geometry
    roof_floor_area_m2 = roof_source["floor_area_m2"]
    roof_perimeter_m = roof_source["roof_perimeter_m"]
    roof_ridge_length_m = roof_source["roof_ridge_length_m"]

    roof_area_m2 = 0.0
    if include_roofing:
        roof_area_m2 = roof_floor_area_m2 * PITCH_MULTIPLIER * roofing_factor
        # Fajardo Table 6-2: an 8 ft corrugated sheet covers 0.70 m of width
        # (1 1/2 corrugation side lap) and loses the end lap along the slope.
        sheet_cover_m2 = ROOF_SHEET_EFFECTIVE_WIDTH_M * (ROOF_SHEET_LENGTH_M - ROOF_SHEET_END_LAP_M)
        sheets = roof_area_m2 / sheet_cover_m2
        acc.add("roofingSheets", sheets, "Roof area / sheet coverage", "roofing",
                f"Roof area: {num(roof_floor_area_m2)} m2 top floor x {num(PITCH_MULTIPLIER, 3)} pitch (1:3) x "
                f"{num(roofing_factor)} roofing factor = {num(roof_area_m2)} m2 / ({ROOF_SHEET_EFFECTIVE_WIDTH_M} m effective width x "
                f"({ROOF_SHEET_LENGTH_M} m - {ROOF_SHEET_END_LAP_M} m end lap) = {num(sheet_cover_m2, 3)} m2 per sheet) = {num(sheets)} sheets")
        purlin_run_m = roof_perimeter_m / 2
        purlins = ceil_int(purlin_run_m / PURLIN_SPACING_M) + 1
        acc.add("purlins", purlins, "Roof run / purlin spacing", "roofing",
                f"Roof run: {num(roof_perimeter_m)} m roof perimeter / 2 = {num(purlin_run_m)} m / {PURLIN_SPACING_M} m spacing, rounded up, + 1 = {purlins} rows")
        ridge_piece_m = ROOF_ACCESSORY_LENGTH_M["ridge"]
        ridge = ceil_int(roof_ridge_length_m / ridge_piece_m)
        acc.add("ridge", ridge, "Ridge length / ridge roll length", "roofing",
                f"Ridge length {num(roof_ridge_length_m)} m / {ridge_piece_m} m per ridge roll, rounded up = {ridge} pieces")
        flashing_piece_m = ROOF_ACCESSORY_LENGTH_M["flashing"]
        flashing = ceil_int(roof_perimeter_m / flashing_piece_m)
        acc.add("flashing", flashing, "Roof perimeter / flashing length", "roofing",
                f"Roof perimeter {num(roof_perimeter_m)} m / {flashing_piece_m} m per flashing, rounded up = {flashing} pieces")
        # Truss angle bar by weight (the engineer, 2026-10-04): roof area x
        # framing weight per m2 / angle bar weight per m = meters of angle
        # bar, / 6 m bars. The allowance covers every truss member, so there
        # is no separate doubling. Waste is the general wastage below.
        framing_kg_per_m2 = overrides.get("trussFramingKgPerM2", TRUSS_FRAMING_KG_PER_M2)
        angle_kg_per_m = overrides.get("angleBarKgPerM", ANGLE_BAR_KG_PER_M)
        angle_m = roof_area_m2 * framing_kg_per_m2 / angle_kg_per_m
        angle_bars = angle_m / ANGLE_BAR_LENGTH_M
        acc.add("angleBar", angle_bars, "Roof area x framing weight / angle bar weight / 6 m", "roofing",
                f"Roof area {num(roof_area_m2)} m2 x {num(framing_kg_per_m2)} kg per m2 / {num(angle_kg_per_m)} kg per m = "
                f"{num(angle_m)} m / {num(ANGLE_BAR_LENGTH_M)} m per bar = {num(angle_bars)} bars")
        gutter_piece_m = ROOF_ACCESSORY_LENGTH_M["gutter"]
        gutter = ceil_int(roof_perimeter_m / gutter_piece_m)
        acc.add("gutter", gutter, "Roof eave length / gutter length", "roofing",
                f"Eave length taken as the roof perimeter {num(roof_perimeter_m)} m / {gutter_piece_m} m per gutter, rounded up = {gutter} pieces")

    # --- Table 17: Footing materials ----------------------------------------
    footing_w = overrides.get("footingWidth", 0.60)
    footing_l = overrides.get("footingLength", 0.60)
    # One footing per ground floor column unless the plan says otherwise.
    footing_count = overrides.get("footingCount", column_count)
    # Concrete uses the footing's own thickness. Footing depth is how far the
    # footing sits below ground (it sets the column bar length above), not the
    # concrete height. 0.30 m is our default; in the 2026-10-03 demo the
    # engineer seemed to enter a 0.30 m footing depth, but the transcript is
    # unclear, so confirm with the engineers.
    footing_thickness = overrides.get("footingThickness", DEFAULT_FOOTING_THICKNESS_M)
    footing_volume = footing_w * footing_l * footing_thickness * footing_count
    acc.add_concrete_mix(footing_volume, cement_factor, "Footing volume x count", "shared",
                         f"Footings {footing_count} x {num(footing_w)} x {num(footing_l)} x {num(footing_thickness)} m thick")
    # Footing forms: the four sides of each footing (engineers, 2026-10-03).
    footing_formwork_area = 2 * (footing_w + footing_l) * footing_thickness * footing_count
    # Footing rebar: 100 kg of 16mm bars per m3 of footing concrete (the
    # engineer's sheet, 2026-10-04). No bar grid to count ties from, so tie
    # wire is 1 kg per 100 kg of bars (our assumption).
    footing_rebar_rate = overrides.get("footingRebarKgPerM3", FOOTING_REBAR_KG_PER_M3)
    footing_rebar_kg = footing_volume * footing_rebar_rate
    footing_rebar_m = footing_rebar_kg / REBAR_UNIT_WEIGHT_16MM_KG_PER_M
    rebar_weight_by_category["shared"] += footing_rebar_kg
    add_bar_length(16, footing_rebar_m)
    rebar_steps.append(
        f"Footings, 16mm: {num(footing_volume, 3)} m3 x {num(footing_rebar_rate)} kg per m3 = {num(footing_rebar_kg)} kg "
        f"({num(footing_rebar_m)} m at 1.580 kg/m)")
    footing_tie_wire_kg = footing_rebar_kg / 100
    tie_wire_by_category["shared"] += footing_tie_wire_kg
    tie_wire_steps.append(f"Footings: {num(footing_rebar_kg)} kg of bars x 1 kg per 100 kg = {num(footing_tie_wire_kg)} kg")

    # --- Table 18: Stair materials (2-storey only) --------------------------
    member_stairs = None
    if storeys >= 2:
        # Table 18: all stair values are tunable (riser, tread, waist thickness,
        # rebar spacing). The stair rises the ground floor height.
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
        add_bar_length(10, stair_rebar_length_m)
        rebar_steps.append(
            f"Stairs, 10mm @ {num(stair_rebar_spacing)} m: {stair_across_bars} bars x {num(stair_width)} m + "
            f"{stair_along_bars} bars x {num(slant)} m = {num(stair_rebar_length_m)} m x 0.617 kg/m = {num(stair_rebar_kg)} kg")
        add_grid_tie_wire(stair_across_bars, stair_along_bars, "Stairs", "shared")
        member_stairs = {"riser": riser_height, "tread": tread_depth, "width": stair_width, "waist": waist_thickness,
                         "risers": risers, "floor_h": floor_to_floor_h, "slant": slant, "spacing": stair_rebar_spacing,
                         "across": stair_across_bars, "along": stair_along_bars, "length_m": stair_rebar_length_m}

    # --- Table 19: Scaffolding & Formwork ------------------------------------
    # Both floors' real areas when a second floor file is given, else floor area x storeys.
    total_floor_area_m2 = floor_area_m2 + geometry2["floor_area_m2"] if geometry2 is not None else floor_area_m2 * storeys

    # Coverage per scaffolding set, 1.8m x 1.2m (Table 19, OK'd in Reply 2). Overridable.
    scaffolding_set_width = overrides.get("scaffoldingSetWidth", 1.8)
    scaffolding_set_height = overrides.get("scaffoldingSetHeight", 1.2)
    building_height = overrides.get("buildingHeight", sum(floor_heights))
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
    interior_scaffold_height = max(building_height - sum(floor_heights[:-1]), scaffolding_set_height)
    computed_scaffolding_sets = (
        floor_perimeter_m * building_height + truss_run_m * interior_scaffold_height
    ) / (scaffolding_set_width * scaffolding_set_height)
    # A set-count override (e.g. a contractor quote) skips the formula.
    scaffolding_set_count_override = overrides.get("scaffoldingSetCount")
    if scaffolding_set_count_override is not None:
        scaffold_step = f"Your set count: {num(scaffolding_set_count_override)} sets"
    else:
        height_note = ("your building height" if "buildingHeight" in overrides
                       else " + ".join(f"{num(h)} m" for h in floor_heights) + (f" + {num(scaffolding_set_height)} m roofing allowance" if include_roofing else ""))
        truss_part = (f" + truss length {num(truss_run_m)} m x {num(interior_scaffold_height)} m interior height" if truss_run_m > 0 else "")
        scaffold_step = (f"Ground floor perimeter {num(floor_perimeter_m)} m x height {num(building_height)} m ({height_note}){truss_part} "
                         f"= {num(floor_perimeter_m * building_height + truss_run_m * interior_scaffold_height)} m2 / "
                         f"({num(scaffolding_set_width)} m x {num(scaffolding_set_height)} m per set) = {num(computed_scaffolding_sets)} sets"
                         f" (1 set = {SCAFFOLD_SET_PARTS}; planks and ladders not included)")
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

    # Form areas as the engineer writes them (2026-10-04): columns
    # (W + L) x 2 x H, beams (W + 2D) x L (two sides and a bottom), footings
    # (W + L) x 2 x T. Slabs use their floor area.
    column_formwork_area = sum(2 * (w + d) * h * n for w, d, h, n in column_floors)
    beam_perimeter = 2 * beam_d + beam_w
    beam_formwork_area = beam_perimeter * beam_length_total
    formwork_area = total_floor_area_m2 + column_formwork_area + beam_formwork_area + footing_formwork_area
    # One 1.22m x 2.44m sheet covers 2.98 m2 (Reply 10). The 5-10% cutting
    # allowance is the wastage multiplier applied below, so it is not added here.
    formwork_text = (f"Formwork area: slabs {num(total_floor_area_m2)} m2 + columns {num(column_formwork_area)} m2 "
                     f"+ beams {num(beam_perimeter)} m (2 sides + bottom) x {num(beam_length_total)} m "
                     f"+ footing sides {num(footing_formwork_area)} m2 = {num(formwork_area)} m2")
    plywood = formwork_area / (1.22 * 2.44)
    acc.add("plywood", plywood, "Formwork area / sheet coverage", "shared", formwork_text)
    acc.steps["plywood"].append(f"{num(formwork_area)} m2 / 2.98 m2 per sheet (1.22 m x 2.44 m) = {num(plywood)} sheets")
    # 2" x 2" frame lumber per 2.88 m2 plywood form (Fajardo Table 5-1).
    # Slab forms get no frame: they rest on the steel props above, which take
    # the place of Fajardo's wood staging.
    column_lumber = column_formwork_area / FAJARDO_FORM_SHEET_M2 * COLUMN_FORM_BDFT_PER_SHEET
    beam_lumber = beam_formwork_area / FAJARDO_FORM_SHEET_M2 * BEAM_FORM_BDFT_PER_SHEET
    # Footing side forms are framed like column forms (no Fajardo rate of their own).
    footing_lumber = footing_formwork_area / FAJARDO_FORM_SHEET_M2 * COLUMN_FORM_BDFT_PER_SHEET
    lumber = column_lumber + beam_lumber + footing_lumber
    acc.add("lumber", lumber, "Form area / 2.88 m2 x frame bd.ft. per sheet", "shared",
            f"Columns {num(column_formwork_area)} m2 / {FAJARDO_FORM_SHEET_M2} m2 x {COLUMN_FORM_BDFT_PER_SHEET} bd.ft. = {num(column_lumber)} bd.ft.")
    acc.steps["lumber"].append(
        f"Beams {num(beam_formwork_area)} m2 / {FAJARDO_FORM_SHEET_M2} m2 x {BEAM_FORM_BDFT_PER_SHEET} bd.ft. = {num(beam_lumber)} bd.ft.")
    acc.steps["lumber"].append(
        f"Footings {num(footing_formwork_area)} m2 / {FAJARDO_FORM_SHEET_M2} m2 x {COLUMN_FORM_BDFT_PER_SHEET} bd.ft. = {num(footing_lumber)} bd.ft.")
    acc.steps["lumber"].append("Slab forms: no frame lumber, the steel props support them")

    # --- Reinforcement rollup (rebar and tie wire) ---
    # Computed per category so each breakdown is correct. Weight already uses
    # each diameter, so only the Steel Factor is applied here.
    for category, weight_kg in rebar_weight_by_category.items():
        if weight_kg > 0:
            acc.add("steelRebar", weight_kg * steel_factor / 1000, "Reinforcement length x unit weight", category)
    for category, tie_kg in tie_wire_by_category.items():
        if tie_kg > 0:
            acc.add("tieWire", tie_kg * steel_factor, "Ties counted from the bars", category)
    total_rebar_kg = sum(rebar_weight_by_category.values())
    if total_rebar_kg > 0:
        adjusted_total_kg = total_rebar_kg * steel_factor
        acc.steps["steelRebar"] = rebar_steps + [
            f"Total {num(total_rebar_kg)} kg x {num(steel_factor)} steel factor = {num(adjusted_total_kg)} kg / 1,000 = {num(adjusted_total_kg / 1000, 3)} tons"]
    # Rebar is bought as 6 m bars. Same steel factor as the weight, then each
    # size is rounded up to whole bars (cutting waste is not optimized).
    bar_pieces = [
        {"diameterMm": diameter_mm,
         "lengthM": round(length_m * steel_factor, 2),
         "pieces": ceil_int(length_m * steel_factor / REBAR_BAR_LENGTH_M)}
        for diameter_mm, length_m in sorted(bar_length_by_diameter.items()) if length_m > 0
    ]
    if bar_pieces:
        acc.steps["steelRebar"].append("In 6 m bars: " + ", ".join(
            f"{p['diameterMm']}mm {num(p['lengthM'])} m / 6 = {p['pieces']:,} pcs" for p in bar_pieces))
    total_tie_wire_kg = sum(tie_wire_by_category.values())
    if total_tie_wire_kg > 0:
        acc.steps["tieWire"] = tie_wire_steps + [
            f"Total {num(total_tie_wire_kg)} kg x {num(steel_factor)} steel factor = {num(total_tie_wire_kg * steel_factor)} kg"]

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
            **({"barPieces": bar_pieces} if key == "steelRebar" and bar_pieces else {}),
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
        "groundBeamLength": round(ground_beam_length, 2),
        "columnBelowGroundHeight": round(below_ground_h, 2),
        # What the engine uses when each of these Design parameters is blank,
        # so the page can show the real number instead of "Auto".
        "computedDefaults": {
            "columnCount": detected_column_count or DEFAULT_COLUMN_COUNT,
            "footingCount": column_count,
            "columnHeight": round(sum(floor_heights), 2),
            "beamLength": round(default_beam_length, 2),
            "groundBeamLength": round(geometry.get("ftbeam_length_m", 0.0), 2),
            "buildingHeight": round(sum(floor_heights) + (scaffolding_set_height if include_roofing else 0.0), 2),
            "scaffoldingSetCount": round(computed_scaffolding_sets, 2),
        },
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

    # "By member" breakdown, laid out like the engineer's manual sheets
    # (member_sheets.py). Raw values: no factors or wastage.
    has_below_ground = below_ground_h > 0 and column_count > 0
    floor_names = ([("GF", "Ground floor"), ("2F", "2nd floor")] if geometry2 is not None
                   else [("GF", "Ground floor")] if storeys == 1 else [("GF2F", "Ground + 2nd floor")])
    names = ([("BGF", "Below ground floor")] if has_below_ground else []) + floor_names
    column_segments = []
    for (abbr, label), (w, d_, h, count) in zip(names, column_floors):
        h_note = (f"footing depth - thickness of footing = {num(footing_depth)} - {num(footing_thickness)} = {num(h)} m"
                  if abbr == "BGF" else None)
        column_segments.append((abbr, label, w, d_, h, count, h_note))
    beam_levels = []
    if ground_beam_length > 0:
        beam_levels.append(("GB", "Ground beam", ground_beam_length))
    if "beamLength" in overrides:
        beam_levels.append(("FB", "Floor beams (entered)", floor_beam_length))
    elif geometry2 is not None:
        beam_levels.append(("B1", "Ground floor plan beams" + (" (BEAM layer)" if ground_from_layer else " (wall run)"), ground_run))
        beam_levels.append(("B2", "2nd floor plan beams" + (" (BEAM layer)" if second_from_layer else " (wall run)"), second_run))
    else:
        beam_levels.append(("FB", f"Floor beams ({storeys} floor{'s' if storeys > 1 else ''} x {num(ground_run)} m)", floor_beam_length))
    roof_member = None
    if include_roofing:
        raw_roof_area = roof_floor_area_m2 * PITCH_MULTIPLIER
        roof_member = {
            "area": raw_roof_area, "floor_area": roof_floor_area_m2, "pitch": PITCH_MULTIPLIER,
            "framing_kg_per_m2": framing_kg_per_m2, "angle_kg_per_m": angle_kg_per_m,
            "sheet_cover": ROOF_SHEET_EFFECTIVE_WIDTH_M * (ROOF_SHEET_LENGTH_M - ROOF_SHEET_END_LAP_M),
            "perimeter": roof_perimeter_m, "ridge": roof_ridge_length_m,
            "purlins": purlins, "ridge_pcs": ridge, "flashing": flashing, "gutter": gutter,
            "piece_m": ROOF_ACCESSORY_LENGTH_M,
        }
    member_breakdown = build_member_sheets({
        "unit_weight": bar_unit_weight,
        "column_form_bdft": COLUMN_FORM_BDFT_PER_SHEET, "beam_form_bdft": BEAM_FORM_BDFT_PER_SHEET,
        "form_sheet_m2": FAJARDO_FORM_SHEET_M2,
        "footing": {"w": footing_w, "l": footing_l, "t": footing_thickness, "count": footing_count, "rate": footing_rebar_rate},
        "column": {"rate": column_rate, "main_mm": column_main_mm, "tie_mm": column_tie_mm, "segments": column_segments},
        "beam": {"rate": beam_rate, "w": beam_w, "d": beam_d, "main_mm": beam_main_mm, "stirrup_mm": stirrup_mm, "levels": beam_levels},
        "slabs": {"items": member_slabs, "form_area": total_floor_area_m2},
        "stairs": member_stairs,
        "walls": member_walls,
        "roof": roof_member,
        "scaffolding": {"parts": SCAFFOLD_SET_PARTS, "w": scaffolding_set_width, "h": scaffolding_set_height,
                        "sets": scaffolding_set_count_override if scaffolding_set_count_override is not None else computed_scaffolding_sets,
                        "text": scaffold_step},
    })

    return {
        "measurements": measurements,
        "materials": materials,
        "memberBreakdown": member_breakdown,
    }

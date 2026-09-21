"""
Rule-based quantity take-off — implements the capstone paper's Tables
12-19 (Wall, Slab, Column, Beam, Roofing, Footing, Stair, Scaffolding &
Formwork Material Computation) against the geometry `dxf_reader.py`
extracts, aggregated onto the 16 material keys the frontend already uses
(see frontend/src/features/projects/data/parsedProjectMock.js).

A few inputs the paper itself documents as NOT derivable from a 2D DXF
(Section 4.3.3.2: beam dimensions, floor-to-floor height, building
elevation, bay sections) are accepted as optional overrides with the
paper's own stated defaults, exactly as its "Estimation Calibration
Settings" design intends.

`compute_materials` optionally takes a second floor's own geometry
(`geometry2`, 2-storey projects only) when the user uploaded a separate
DXF per floor instead of one file scaled by storeys. When given, wall
materials, the suspended (2nd floor) slab, roofing, and the combined
floor-area-driven quantities (steel props, formwork, the reported floor
area) all use each floor's own real geometry instead of reusing the
ground floor's for both — real floor plans can (and do) have genuinely
different footprints per storey. The single-file path (`geometry2=None`)
is unchanged and remains the default/fallback for anyone who only has
one file, or whose DXF already draws both floors on the same layers.

Assumptions/gaps, several already run past a licensed civil engineer's
expert-validation review (Engr. Espiritu, see the project's validation
form) — his corrections are applied where noted; everything else here is
still an unreviewed candidate for that same process:
  - Rebar diameter is now element-specific per his confirmed defaults:
    10mm for walls and the ground slab, 12mm for the suspended (2nd floor)
    slab. Stairs still use the 10mm rate too, but that one's still an
    unvalidated assumption — his form didn't state a stair diameter.
  - Column rebar is now computed (previously a known gap — no reinforcement
    at all). Diameter is confirmed by his validation (12mm 1-storey / 16mm
    2-storey). Bar count per column is NOT yet confirmed by him — it's set
    to 4 (both storey types), based on the National Structural Code of the
    Philippines' general minimum-reinforcement rules for columns (a flat
    minimum of 4 longitudinal bars for a rectangular tied column, and
    separately a minimum 1% gross-area steel ratio — worked against this
    system's own column sizes, the 1% ratio needs fewer than 4 bars either
    way, so the flat minimum governs both cases). See docs/nscp-citations.md
    for the full research and sources. Sent to Engr. Espiritu as an open
    question (confirm-or-correct) — COLUMN_REBAR_BAR_COUNT below should be
    updated once he replies, same as the diameter mapping above.
  - Footing plan dimensions default to 0.60m x 0.60m per column (paper
    gives a default depth only, not width/length).
  - Total beam run length is approximated as the wall run length (or, with
    a second floor's own DXF given, the sum of both floors' real wall run)
    — no BEAM DXF layer exists in the paper's layer convention.
  - Angle bar (frontend key `angleBar`) has no formula in Table 16 at
    all; approximated here using the same 6m-piece convention as
    purlins/ridge, applied to the roof perimeter.
  - Roofing "purlin run length" (Table 16 calls it "length of the roof
    along the slope direction", not otherwise defined) is approximated
    as half the roof perimeter.
  - Gutter (Table 16: roof eave length / 1.8m per pc) has no distinct
    "eave length" available from a simple rectangular ROOF outline, so
    it's approximated using the same roof perimeter flashing already uses.
  - Formwork materials (plywood/"Phenolic Board", lumber/"Coco Lumber",
    steel props, scaffolding — Table 19) are computed here (below) as a
    one-time purchase of the full raw quantity, with no reuse/cycling
    factor. This matches Table 19's own formula exactly, which has no
    reuse variable. A local civil engineer reviewed this exact concern
    from the expert validation form on 2026-09-07 and endorsed keeping it
    this way: reuse is real in practice, but it's thickness-dependent —
    thin 1/4"-1/8" plywood (typical on a house) is basically single-use,
    while thicker 3/4" plywood (used when a job is already known to need
    3+ pours) can go around 3 uses, though thinner plywood also needs more
    stud lumber per sheet for sturdiness either way. The engineer's actual
    reason to still estimate quantity as one-time-use rather than dividing
    by an assumed reuse count: you can't know ahead of time whether a
    stripped/cut formwork piece is still a usable shape for whatever gets
    built next, so treating reuse as a price adjustment (optional, not
    required) is safer than baking an assumed reuse count into quantity.
    See services/optimization.service.js's computeBom (Node backend) —
    it doesn't compute formwork quantity itself, it just prices whatever
    quantity this file already produced, the same way it prices every
    other material key.
"""
import math

WALL_HEIGHT_PER_STOREY_M = 3.0
# Fallback only — the resolved per-storey height used everywhere (walls,
# stairs, scaffolding's building-height default) is `floor_to_floor_h`
# (overrides.get("floorToFloorHeight", WALL_HEIGHT_PER_STOREY_M)), so a
# user's override actually reaches every height-driven material instead of
# only some of them.
# DEFAULT_COLUMN_COUNT below is used only when a DXF has no COLUMN layer at all. Previously this sat behind
# an `overrides.get("fallbackColumnCount", 4)` lookup, but "fallbackColumnCount"
# was never a real override key (it is not in designOverrides.service.js's
# FIELDS, not a DB column, and not a UI field), so the literal 4 was always
# what got used. Named here instead of pretending it is configurable.
DEFAULT_COLUMN_COUNT = 4
# Standard nominal mass formula for deformed reinforcing bars, kg/m = d^2/162
# (d in mm) — PNS/DPWH standard table. Element-to-diameter mapping per
# Engr. Espiritu's expert validation: 10mm for walls/ground slab, 12mm for
# the suspended (2nd floor) slab.
REBAR_UNIT_WEIGHT_10MM_KG_PER_M = 0.617
REBAR_UNIT_WEIGHT_12MM_KG_PER_M = 0.889
# 16mm, same d^2/162 formula — used for 2-storey column rebar (Engr.
# Espiritu's validated column diameter for that case).
REBAR_UNIT_WEIGHT_16MM_KG_PER_M = 1.580

# Bar count per column, both storey types — NOT yet confirmed by Engr.
# Espiritu (unlike the diameters below, which are). Sourced from NSCP's
# general minimum-reinforcement rules for columns, not this paper — see the
# docstring above and docs/nscp-citations.md for the full derivation.
COLUMN_REBAR_BAR_COUNT = 4
# Column rebar diameter per storey type — this half IS validated.
COLUMN_REBAR_DIAMETER_MM = {1: 12, 2: 16}

# NSCP 2016 moderate slope, rise:run = 1:3 -> sqrt(rise^2 + run^2) / run = sqrt(10) / 3
PITCH_MULTIPLIER = math.sqrt(10) / 3

# How each material's unit gets rounded in the take-off. Anything sold as a
# countable item is rounded UP (Table 12-19's own "rounded up") — you can't buy
# 0.744 of a cement bag or half a plywood sheet. Only genuinely bulk/weight
# units stay fractional, because those really are ordered by volume or weight.
# "bags" used to be missing from WHOLE_UNITS, so cement — the one material
# measured in bags, and the largest single quantity in the take-off — was
# reported as e.g. "143.744 bags" while every other countable material was
# rounded up. Splitting the two lists out (instead of one tuple and an else)
# also means a newly added unit that belongs to neither is caught below rather
# than silently defaulting to fractional.
WHOLE_UNITS = ("pcs", "sheets", "lengths", "sets", "bd.ft.", "bags")
FRACTIONAL_UNITS = ("m3", "tons", "kg")


def ceil_int(value):
    return int(math.ceil(value)) if value > 0 else 0


def default_column_size(storeys):
    return (0.25, 0.25, 6.0) if storeys >= 2 else (0.20, 0.20, 3.0)


def default_footing_depth(storeys):
    return 2.0 if storeys >= 2 else 1.5


# The four buckets every material contribution gets tagged with — "which
# DXF file (or neither) actually drove this number". "roofing" and "shared"
# aren't files; they're honest labels for contributions that don't belong
# to one floor at all (a column runs continuously through both floors, a
# footing is foundation-level, a roof sits above the top floor). Forcing
# those into "ground" or "second" would just be a fake-precise split.
SOURCE_CATEGORIES = ("ground", "second", "roofing", "shared")


class MaterialAccumulator:
    """Sums cement/sand/gravel/rebar contributions across every structural
    element (wall, slab, column, beam, footing, stair) into one running
    total per frontend material key — the frontend shows one row per
    material, not one per structural element. Also keeps a per-category
    breakdown of the same totals (see SOURCE_CATEGORIES) alongside, purely
    additive — every existing consumer of `.totals` is unaffected."""

    def __init__(self):
        self.totals = {}
        self.bases = {}
        self.by_category = {}  # key -> {category: amount}

    def add(self, key, amount, basis, category="shared"):
        self.totals[key] = self.totals.get(key, 0.0) + amount
        # Keep the first basis note seen for a material as its displayed
        # derivation — later contributions still add to the total.
        self.bases.setdefault(key, basis)
        cat_totals = self.by_category.setdefault(key, {})
        cat_totals[category] = cat_totals.get(category, 0.0) + amount

    def add_concrete_mix(self, volume_m3, cement_factor, basis, category="shared"):
        self.add("cement", volume_m3 * 9 * cement_factor, basis, category)
        self.add("sand", volume_m3 * 0.50, basis, category)
        self.add("gravel", volume_m3 * 1.0, basis, category)


def compute_materials(geometry, storeys, include_roofing, constants, overrides, geometry2=None):
    # A second floor's geometry only ever means something for a 2-storey
    # project — ignore a stray/leftover one rather than let it corrupt a
    # 1-storey computation.
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
    # Ground floor's own COLUMN layer only, even with a second floor's DXF
    # given — a column is one continuous member from footing to roof, not a
    # separate one per floor, so the 2nd floor's COLUMN layer (if it even has
    # one) isn't a second count to add.
    detected_column_count = geometry["column_count"]
    if overrides.get("columnCount") is not None:
        column_count = overrides["columnCount"]
        column_count_source = "override"
    elif detected_column_count:
        column_count = detected_column_count
        column_count_source = "detected"
    else:
        # No COLUMN layer (or an empty one). Unlike a missing WALL/FLOOR layer
        # — which engine.py fails loudly on — we keep going with a default,
        # because plenty of simple plans genuinely don't draw columns. But it
        # IS an assumption that adds column AND footing concrete, so it's
        # reported as such instead of being passed off as an extraction result.
        column_count = DEFAULT_COLUMN_COUNT
        column_count_source = "assumed"
    # roof_perimeter_m/roof_ridge_length_m are resolved further down (Table
    # 16) against whichever file actually represents the roof — the ground
    # floor's here, or the second floor's when one was given.

    # Rebar WEIGHT (not raw length) tracked per category — Table 12/13/18
    # all contribute to the same steelRebar/tieWire totals, but each
    # contribution both belongs to a specific source (see SOURCE_CATEGORIES)
    # and uses its own diameter's unit weight (walls/ground slab at 10mm,
    # suspended slab at 12mm — see REBAR_UNIT_WEIGHT_*), so length is
    # converted to weight right where each contribution happens rather than
    # summed as one length and converted once with a single flat rate.
    rebar_weight_by_category = {category: 0.0 for category in SOURCE_CATEGORIES}

    # --- Table 12: Wall materials -----------------------------------------
    # floor_to_floor_h drives every per-storey height in the take-off (walls
    # here, stairs and scaffolding's building-height default further down) —
    # previously walls alone stayed hardcoded to WALL_HEIGHT_PER_STOREY_M
    # even when a user overrode floorToFloorHeight for a taller-than-default
    # storey, so CHB/wall cement/wall sand/wall rebar silently kept using
    # 3.0m while stairs and scaffolding correctly picked up the override.
    floor_to_floor_h = overrides.get("floorToFloorHeight", WALL_HEIGHT_PER_STOREY_M)

    # Each storey uses its own floor's real wall run/openings when a second
    # floor's DXF was supplied (storey index 1 -> geometry2); otherwise the
    # ground floor's geometry is reused for every storey, exactly as before.
    floor_geometries = [geometry, geometry2] if geometry2 is not None else [geometry]
    for storey in range(storeys):
        storey_geometry = floor_geometries[storey] if storey < len(floor_geometries) else floor_geometries[-1]
        storey_category = "second" if storey_geometry is geometry2 else "ground"
        storey_wall_length_m = storey_geometry["wall_length_m"]
        storey_door_area_m2 = storey_geometry["door_area_m2"]
        storey_window_area_m2 = storey_geometry["window_area_m2"]

        gross_wall_area = storey_wall_length_m * floor_to_floor_h
        net_wall_area = max(gross_wall_area - storey_door_area_m2 - storey_window_area_m2, 0.0)

        acc.add("hollowBlocks", net_wall_area * 12.5 * 1.05, "Wall area / coverage", storey_category)
        acc.add("cement", net_wall_area * 0.522 * cement_factor, "Wall area x mortar rate", storey_category)
        acc.add("sand", net_wall_area * 0.0435, "Wall area x mortar rate", storey_category)

        vertical_bars = ceil_int(storey_wall_length_m / 0.60) + 1
        horizontal_bars = ceil_int(floor_to_floor_h / 0.60) + 1
        wall_rebar_length_m = vertical_bars * floor_to_floor_h + horizontal_bars * storey_wall_length_m
        rebar_weight_by_category[storey_category] += wall_rebar_length_m * REBAR_UNIT_WEIGHT_10MM_KG_PER_M

    # --- Table 13: Slab materials ------------------------------------------
    ground_slab_volume = floor_area_m2 * 0.15
    acc.add_concrete_mix(ground_slab_volume, cement_factor, "Ground slab volume x mix rate", "ground")
    bounds = geometry.get("floor_bounds")
    if bounds:
        floor_len = max(bounds[2] - bounds[0], 0.01)
        floor_wid = max(bounds[3] - bounds[1], 0.01)
        rebar_len_count = ceil_int(floor_len / 0.30) + 1
        rebar_wid_count = ceil_int(floor_wid / 0.30) + 1
        ground_slab_rebar_length_m = rebar_len_count * floor_wid + rebar_wid_count * floor_len
        rebar_weight_by_category["ground"] += ground_slab_rebar_length_m * REBAR_UNIT_WEIGHT_10MM_KG_PER_M

    if storeys >= 2:
        # The 2nd floor's own footprint when its DXF was supplied — real
        # floor plans can have a genuinely different upper-floor footprint
        # (e.g. a footprint that extends over an open ground-floor garage);
        # otherwise falls back to the ground floor's footprint, as before.
        # Categorized as "second" only when it's genuinely that floor's own
        # data — the single-file fallback is still the ground floor's data,
        # so it's honestly "ground" in the breakdown even though it's
        # standing in for the suspended slab.
        suspended_source = geometry2 if geometry2 is not None else geometry
        suspended_category = "second" if geometry2 is not None else "ground"
        suspended_floor_area_m2 = suspended_source["floor_area_m2"]
        suspended_slab_volume = suspended_floor_area_m2 * 0.125
        acc.add_concrete_mix(suspended_slab_volume, cement_factor, "Suspended slab volume x mix rate", suspended_category)
        suspended_bounds = suspended_source.get("floor_bounds")
        if suspended_bounds:
            suspended_len = max(suspended_bounds[2] - suspended_bounds[0], 0.01)
            suspended_wid = max(suspended_bounds[3] - suspended_bounds[1], 0.01)
            rebar_len_count = ceil_int(suspended_len / 0.15) + 1
            rebar_wid_count = ceil_int(suspended_wid / 0.15) + 1
            suspended_slab_rebar_length_m = rebar_len_count * suspended_wid + rebar_wid_count * suspended_len
            rebar_weight_by_category[suspended_category] += suspended_slab_rebar_length_m * REBAR_UNIT_WEIGHT_12MM_KG_PER_M

    # --- Table 14: Column materials -----------------------------------------
    col_w, col_d, col_h = default_column_size(storeys)
    col_w = overrides.get("columnWidth", col_w)
    col_d = overrides.get("columnDepth", col_d)
    col_h = overrides.get("columnHeight", col_h)
    column_volume = col_w * col_d * col_h * column_count
    acc.add_concrete_mix(column_volume, cement_factor, "Column volume x count", "shared")

    # Column rebar — diameter is Engr. Espiritu-validated (12mm 1-storey /
    # 16mm 2-storey); bar count (COLUMN_REBAR_BAR_COUNT) is not yet
    # confirmed by him, see the module docstring and docs/nscp-citations.md.
    # "shared" category, same as the concrete above — one column runs
    # continuously through every floor, not a separate one per floor.
    column_rebar_diameter_mm = COLUMN_REBAR_DIAMETER_MM[2 if storeys >= 2 else 1]
    column_rebar_unit_weight = (
        REBAR_UNIT_WEIGHT_16MM_KG_PER_M if column_rebar_diameter_mm == 16 else REBAR_UNIT_WEIGHT_12MM_KG_PER_M
    )
    column_rebar_length_m = column_count * COLUMN_REBAR_BAR_COUNT * col_h
    rebar_weight_by_category["shared"] += column_rebar_length_m * column_rebar_unit_weight

    # --- Table 15: Beam materials (beam run length approximated from wall run) ---
    beam_w = overrides.get("beamWidth", 0.20)
    beam_d = overrides.get("beamDepth", 0.30)
    # With a second floor's own DXF given, the real combined wall run across
    # both floors is a better approximation than doubling the ground floor's;
    # otherwise unchanged.
    default_beam_length = wall_length_m + geometry2["wall_length_m"] if geometry2 is not None else wall_length_m * storeys
    beam_length_total = overrides.get("beamLength", default_beam_length)
    beam_volume = beam_w * beam_d * beam_length_total
    acc.add_concrete_mix(beam_volume, cement_factor, "Beam volume (wall-run approximation)", "shared")

    # --- Table 16: Roofing materials ----------------------------------------
    # The roof physically sits on the top floor — read its ROOF layer from
    # the second floor's DXF when one was given, else from the single file
    # as before.
    roof_source = geometry2 if geometry2 is not None else geometry
    roof_floor_area_m2 = roof_source["floor_area_m2"]
    roof_perimeter_m = roof_source["roof_perimeter_m"]
    roof_ridge_length_m = roof_source["roof_ridge_length_m"]

    roof_area_m2 = 0.0
    if include_roofing:
        roof_area_m2 = roof_floor_area_m2 * PITCH_MULTIPLIER * roofing_factor
        acc.add("roofingSheets", roof_area_m2 / (0.80 * 2.44), "Roof area / sheet coverage", "roofing")
        purlin_run_m = roof_perimeter_m / 2
        acc.add("purlins", ceil_int(purlin_run_m / 0.60) + 1, "Roof run / purlin spacing", "roofing")
        acc.add("ridge", ceil_int(roof_ridge_length_m / 1.8), "Ridge length / piece length", "roofing")
        acc.add("flashing", ceil_int(roof_perimeter_m / 1.8), "Roof perimeter / piece length", "roofing")
        acc.add("angleBar", ceil_int(roof_perimeter_m / 6.0), "Roof perimeter / piece length (approximation)", "roofing")
        acc.add("gutter", ceil_int(roof_perimeter_m / 1.8), "Roof eave length / piece length (approximated from roof perimeter)", "roofing")

    # --- Table 17: Footing materials ----------------------------------------
    footing_w = overrides.get("footingWidth", 0.60)
    footing_l = overrides.get("footingLength", 0.60)
    footing_depth = overrides.get("footingDepth", default_footing_depth(storeys))
    footing_volume = footing_w * footing_l * footing_depth * column_count
    acc.add_concrete_mix(footing_volume, cement_factor, "Footing volume x count", "shared")

    # --- Table 18: Stair materials (2-storey only) --------------------------
    if storeys >= 2:
        # floor_to_floor_h already resolved above (Table 12) — reused here
        # rather than re-derived, so a floorToFloorHeight override can't
        # drift between the two sections.
        stair_width = overrides.get("stairWidth", 0.90)
        risers = ceil_int(floor_to_floor_h / 0.18)
        treads = max(risers - 1, 0)
        run = treads * 0.25
        slant = math.hypot(floor_to_floor_h, run)
        slab_area = slant * stair_width
        slab_volume = slab_area * 0.15
        step_volume = 0.5 * 0.18 * 0.25 * stair_width * risers
        acc.add_concrete_mix(slab_volume + step_volume, cement_factor, "Stair slab + step volume", "shared")
        # Diameter unspecified by the expert validation form for stairs —
        # 10mm stays a documented assumption here, same as before.
        stair_rebar_length_m = (ceil_int(slant / 0.15) + 1) * stair_width + (ceil_int(stair_width / 0.15) + 1) * slant
        rebar_weight_by_category["shared"] += stair_rebar_length_m * REBAR_UNIT_WEIGHT_10MM_KG_PER_M

    # --- Table 19: Scaffolding & Formwork ------------------------------------
    # True combined footprint (both floors' own real areas) when a second
    # floor's DXF was given; otherwise the existing floor_area x storeys
    # approximation, unchanged.
    total_floor_area_m2 = floor_area_m2 + geometry2["floor_area_m2"] if geometry2 is not None else floor_area_m2 * storeys

    building_height = overrides.get("buildingHeight", storeys * floor_to_floor_h)
    acc.add("scaffolding", (floor_perimeter_m * building_height) / (1.8 * 1.2), "Perimeter x height / coverage", "shared")
    acc.add("steelProps", total_floor_area_m2 / 1.0, "Slab area / coverage per prop", "shared")

    column_perimeter = 2 * (col_w + col_d)
    beam_perimeter = 2 * (beam_w + beam_d)
    formwork_area = (
        total_floor_area_m2
        + (column_perimeter * col_h * column_count)
        + (beam_perimeter * beam_length_total)
    )
    acc.add("plywood", formwork_area / 1.22, "Formwork area / sheet coverage (per Table 19's stated rate)", "shared")
    acc.add("lumber", formwork_area * 3, "Formwork area x board-feet ratio", "shared")

    # --- Reinforcement rollup (Table 12/13/18 rebar + Table 12 tie wire) ----
    # steelRebar/tieWire are computed once per category (not once overall)
    # so their contribution to each category's breakdown is honest, rather
    # than dumping the whole reinforcement total into one bucket. Weight is
    # already diameter-adjusted per contribution (see rebar_weight_by_category
    # above) — only the Steel Factor is left to apply here.
    for category, weight_kg in rebar_weight_by_category.items():
        if weight_kg <= 0:
            continue
        adjusted_weight_kg = weight_kg * steel_factor
        acc.add("steelRebar", adjusted_weight_kg / 1000, "Reinforcement length x unit weight", category)
        acc.add("tieWire", adjusted_weight_kg / 100, "Rebar weight x tie-wire ratio", category)

    # Apply the general wastage factor to consumables prone to cut/spill
    # waste — CHB already carries its own 5% (Table 12); rebar/tie wire are
    # governed by the Steel Factor instead, so neither is touched again here.
    wastage_keys = {"cement", "sand", "gravel", "roofingSheets", "purlins", "ridge",
                     "flashing", "angleBar", "gutter", "plywood", "lumber", "steelProps", "scaffolding"}
    for key in wastage_keys:
        if key in acc.totals:
            acc.totals[key] *= wastage_multiplier
            for category in acc.by_category[key]:
                acc.by_category[key][category] *= wastage_multiplier

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
        # Per-category subtotals are plain-rounded, not ceiling'd like whole-
        # unit totals above — independently ceiling each of 4 buckets can
        # overshoot the already-rounded total (e.g. 6.1+6.1 -> 7+7=14 vs a
        # true total of 12.2 -> 13), so they're shown to 3dp instead and
        # won't always sum to exactly `qty` for whole-unit materials, same
        # as subtotals rounding independently in any real BOQ.
        source_breakdown = {
            category: round(acc.by_category.get(key, {}).get(category, 0.0), 3)
            for category in SOURCE_CATEGORIES
        }
        materials.append({
            "key": key,
            "name": name,
            "quantity": qty,
            "unit": unit,
            "basis": acc.bases.get(key, ""),
            "sourceBreakdown": source_breakdown,
        })

    # Every per-floor quantity below follows the SAME rule as floorArea above:
    # sum both files when a second floor's DXF was given, otherwise scale the
    # one file we have by storeys. That "x storeys" used to be missing here
    # while floorArea had it, so a 2-storey project uploaded as a single file
    # reported one floor's wall run next to a two-storey block count — the
    # take-off loop below already runs per storey, so the materials were right
    # and only the reported measurement was short. Anything derived from these
    # is per-floor: walls, door/window openings, and the floor outline's own
    # perimeter.
    #
    # Deliberately NOT scaled/summed: column_count (one continuous member runs
    # through every floor, not a new one per floor — see its resolution above)
    # and roof_perimeter_m / roof_ridge_length_m (both already come from
    # whichever single file represents the roof via roof_source — there's only
    # ever one roof, no matter how many storeys).
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
        # "columnCount" stays the EFFECTIVE count the take-off actually used —
        # it's what gets persisted to estimation_results.column_count and what
        # every existing consumer reads, so its meaning is unchanged. The two
        # fields beside it are new and purely additive: what the DXF really
        # had (None when there was no COLUMN layer at all), and whether that
        # number came from the drawing, a user override, or our default. The
        # UI used to label this "Columns detected", which was untrue whenever
        # an override or the default was in play.
        "columnCount": column_count,
        "columnCountDetected": detected_column_count or None,
        "columnCountSource": column_count_source,
        "floorPerimeter": round(total_floor_perimeter_m, 2),
        "roofPerimeter": round(roof_perimeter_m, 2),
        "roofRidgeLength": round(roof_ridge_length_m, 2),
    }
    if geometry2 is not None:
        # Per-floor breakdown, only meaningful (and only returned) when a
        # real second floor's own DXF was supplied — with a single file,
        # "ground" and "total" are the same number, so there's nothing
        # honest to show as a separate "second floor" figure.
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

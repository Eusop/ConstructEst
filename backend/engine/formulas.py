"""
Rule-based quantity take-off — implements the capstone paper's Tables
12-19 (Wall, Slab, Column, Beam, Roofing, Footing, Stair, Scaffolding &
Formwork Material Computation) against the geometry `dxf_reader.py`
extracts, aggregated onto the 15 material keys the frontend already uses
(see frontend/src/features/projects/data/parsedProjectMock.js).

A few inputs the paper itself documents as NOT derivable from a 2D DXF
(Section 4.3.3.2: beam dimensions, floor-to-floor height, building
elevation, bay sections) are accepted as optional overrides with the
paper's own stated defaults, exactly as its "Estimation Calibration
Settings" design intends.

Assumptions made where the paper's tables don't give every needed
constant (flagged inline, each one a candidate for the licensed-engineer
validation step the paper itself calls for — this engine hasn't had
that review):
  - Main reinforcement assumed 10mm dia (0.617 kg/m) for all rebar tallies.
  - Footing plan dimensions default to 0.60m x 0.60m per column (paper
    gives a default depth only, not width/length).
  - Total beam run length is approximated as the wall run length (no
    BEAM DXF layer exists in the paper's layer convention).
  - Angle bar (frontend key `angleBar`) has no formula in Table 16 at
    all; approximated here using the same 6m-piece convention as
    purlins/ridge, applied to the roof perimeter.
  - Roofing "purlin run length" (Table 16 calls it "length of the roof
    along the slope direction", not otherwise defined) is approximated
    as half the roof perimeter.
"""
import math

WALL_HEIGHT_PER_STOREY_M = 3.0
REBAR_UNIT_WEIGHT_KG_PER_M = 0.617  # 10mm dia, PNS/DPWH standard table

PITCH_MULTIPLIER = math.sqrt(10 / 3)  # NSCP 2016 moderate slope, rise:run = 1:3


def ceil_int(value):
    return int(math.ceil(value)) if value > 0 else 0


def default_column_size(storeys):
    return (0.25, 0.25, 6.0) if storeys >= 2 else (0.20, 0.20, 3.0)


def default_footing_depth(storeys):
    return 2.0 if storeys >= 2 else 1.5


class MaterialAccumulator:
    """Sums cement/sand/gravel/rebar contributions across every structural
    element (wall, slab, column, beam, footing, stair) into one running
    total per frontend material key — the frontend shows one row per
    material, not one per structural element."""

    def __init__(self):
        self.totals = {}
        self.bases = {}

    def add(self, key, amount, basis):
        self.totals[key] = self.totals.get(key, 0.0) + amount
        # Keep the first basis note seen for a material as its displayed
        # derivation — later contributions still add to the total.
        self.bases.setdefault(key, basis)

    def add_concrete_mix(self, volume_m3, cement_factor, basis):
        self.add("cement", volume_m3 * 9 * cement_factor, basis)
        self.add("sand", volume_m3 * 0.50, basis)
        self.add("gravel", volume_m3 * 1.0, basis)


def compute_materials(geometry, storeys, include_roofing, constants, overrides):
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
    column_count = geometry["column_count"] or overrides.get("fallbackColumnCount", 4)
    roof_perimeter_m = geometry["roof_perimeter_m"]
    roof_ridge_length_m = geometry["roof_ridge_length_m"]

    total_rebar_length_m = 0.0

    # --- Table 12: Wall materials -----------------------------------------
    for storey in range(storeys):
        gross_wall_area = wall_length_m * WALL_HEIGHT_PER_STOREY_M
        net_wall_area = max(gross_wall_area - door_area_m2 - window_area_m2, 0.0)

        acc.add("hollowBlocks", net_wall_area * 12.5 * 1.05, "Wall area / coverage")
        acc.add("cement", net_wall_area * 0.522 * cement_factor, "Wall area x mortar rate")
        acc.add("sand", net_wall_area * 0.0435, "Wall area x mortar rate")

        vertical_bars = ceil_int(wall_length_m / 0.60) + 1
        horizontal_bars = ceil_int(WALL_HEIGHT_PER_STOREY_M / 0.60) + 1
        total_rebar_length_m += vertical_bars * WALL_HEIGHT_PER_STOREY_M
        total_rebar_length_m += horizontal_bars * wall_length_m

    # --- Table 13: Slab materials ------------------------------------------
    ground_slab_volume = floor_area_m2 * 0.15
    acc.add_concrete_mix(ground_slab_volume, cement_factor, "Ground slab volume x mix rate")
    bounds = geometry.get("floor_bounds")
    if bounds:
        floor_len = max(bounds[2] - bounds[0], 0.01)
        floor_wid = max(bounds[3] - bounds[1], 0.01)
        rebar_len_count = ceil_int(floor_len / 0.30) + 1
        rebar_wid_count = ceil_int(floor_wid / 0.30) + 1
        total_rebar_length_m += rebar_len_count * floor_wid + rebar_wid_count * floor_len

    if storeys >= 2:
        suspended_slab_volume = floor_area_m2 * 0.125
        acc.add_concrete_mix(suspended_slab_volume, cement_factor, "Suspended slab volume x mix rate")
        if bounds:
            rebar_len_count = ceil_int(floor_len / 0.15) + 1
            rebar_wid_count = ceil_int(floor_wid / 0.15) + 1
            total_rebar_length_m += rebar_len_count * floor_wid + rebar_wid_count * floor_len

    # --- Table 14: Column materials -----------------------------------------
    col_w, col_d, col_h = default_column_size(storeys)
    col_w = overrides.get("columnWidth", col_w)
    col_d = overrides.get("columnDepth", col_d)
    col_h = overrides.get("columnHeight", col_h)
    column_volume = col_w * col_d * col_h * column_count
    acc.add_concrete_mix(column_volume, cement_factor, "Column volume x count")

    # --- Table 15: Beam materials (beam run length approximated from wall run) ---
    beam_w = overrides.get("beamWidth", 0.20)
    beam_d = overrides.get("beamDepth", 0.30)
    beam_length_total = wall_length_m * storeys
    beam_volume = beam_w * beam_d * beam_length_total
    acc.add_concrete_mix(beam_volume, cement_factor, "Beam volume (wall-run approximation)")

    # --- Table 16: Roofing materials ----------------------------------------
    roof_area_m2 = 0.0
    if include_roofing:
        roof_area_m2 = floor_area_m2 * PITCH_MULTIPLIER * roofing_factor
        acc.add("roofingSheets", roof_area_m2 / (0.80 * 2.44), "Roof area / sheet coverage")
        purlin_run_m = roof_perimeter_m / 2
        acc.add("purlins", ceil_int(purlin_run_m / 0.60) + 1, "Roof run / purlin spacing")
        acc.add("ridge", ceil_int(roof_ridge_length_m / 1.8), "Ridge length / piece length")
        acc.add("flashing", ceil_int(roof_perimeter_m / 1.8), "Roof perimeter / piece length")
        acc.add("angleBar", ceil_int(roof_perimeter_m / 6.0), "Roof perimeter / piece length (approximation)")

    # --- Table 17: Footing materials ----------------------------------------
    footing_w = overrides.get("footingWidth", 0.60)
    footing_l = overrides.get("footingLength", 0.60)
    footing_depth = overrides.get("footingDepth", default_footing_depth(storeys))
    footing_volume = footing_w * footing_l * footing_depth * column_count
    acc.add_concrete_mix(footing_volume, cement_factor, "Footing volume x count")

    # --- Table 18: Stair materials (2-storey only) --------------------------
    if storeys >= 2:
        floor_to_floor_h = overrides.get("floorToFloorHeight", 3.0)
        stair_width = overrides.get("stairWidth", 0.90)
        risers = ceil_int(floor_to_floor_h / 0.18)
        treads = max(risers - 1, 0)
        run = treads * 0.25
        slant = math.hypot(floor_to_floor_h, run)
        slab_area = slant * stair_width
        slab_volume = slab_area * 0.15
        step_volume = 0.5 * 0.18 * 0.25 * stair_width * risers
        acc.add_concrete_mix(slab_volume + step_volume, cement_factor, "Stair slab + step volume")
        total_rebar_length_m += (ceil_int(slant / 0.15) + 1) * stair_width
        total_rebar_length_m += (ceil_int(stair_width / 0.15) + 1) * slant

    # --- Table 19: Scaffolding & Formwork ------------------------------------
    building_height = overrides.get("buildingHeight", storeys * WALL_HEIGHT_PER_STOREY_M)
    acc.add("scaffolding", (floor_perimeter_m * building_height) / (1.8 * 1.2), "Perimeter x height / coverage")
    acc.add("steelProps", (floor_area_m2 * storeys) / 1.0, "Slab area / coverage per prop")

    column_perimeter = 2 * (col_w + col_d)
    beam_perimeter = 2 * (beam_w + beam_d)
    formwork_area = (
        (floor_area_m2 * storeys)
        + (column_perimeter * col_h * column_count)
        + (beam_perimeter * beam_length_total)
    )
    acc.add("plywood", formwork_area / 1.22, "Formwork area / sheet coverage (per Table 19's stated rate)")
    acc.add("lumber", formwork_area * 3, "Formwork area x board-feet ratio")

    # --- Reinforcement rollup (Table 12/13/18 rebar + Table 12 tie wire) ----
    total_rebar_weight_kg = total_rebar_length_m * REBAR_UNIT_WEIGHT_KG_PER_M * steel_factor
    acc.add("steelRebar", total_rebar_weight_kg / 1000, "Reinforcement length x unit weight")
    acc.add("tieWire", total_rebar_weight_kg / 100, "Rebar weight x tie-wire ratio")

    # Apply the general wastage factor to consumables prone to cut/spill
    # waste — CHB already carries its own 5% (Table 12); rebar/tie wire are
    # governed by the Steel Factor instead, so neither is touched again here.
    wastage_keys = {"cement", "sand", "gravel", "roofingSheets", "purlins", "ridge",
                     "flashing", "angleBar", "plywood", "lumber", "steelProps", "scaffolding"}
    for key in wastage_keys:
        if key in acc.totals:
            acc.totals[key] *= wastage_multiplier

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
        "plywood": ("Plywood", "pcs"),
        "lumber": ("Lumber", "bd.ft."),
        "steelProps": ("Steel Props", "pcs"),
        "scaffolding": ("Scaffolding", "sets"),
    }

    materials = []
    for key, (name, unit) in material_meta.items():
        if key in ("roofingSheets", "purlins", "ridge", "flashing", "angleBar") and not include_roofing:
            continue
        raw_qty = acc.totals.get(key, 0.0)
        # Whole-unit materials are rounded up (Table 12-19 "rounded up");
        # sand/gravel/rebar/tie wire stay fractional (m3/tons/kg).
        qty = ceil_int(raw_qty) if unit in ("pcs", "sheets", "lengths", "sets", "bd.ft.") else round(raw_qty, 3)
        materials.append({
            "key": key,
            "name": name,
            "quantity": qty,
            "unit": unit,
            "basis": acc.bases.get(key, ""),
        })

    return {
        "measurements": {
            "totalWallLength": round(wall_length_m, 2),
            "floorArea": round(floor_area_m2 * storeys, 2),
            "roofArea": round(roof_area_m2, 2),
            "roomsDetected": geometry["rooms_detected"],
        },
        "materials": materials,
    }

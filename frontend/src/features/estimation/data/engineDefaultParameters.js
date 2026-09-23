/**
 * Mirrors the engine's own hardcoded fallback defaults (backend/engine/
 * formulas.py — verified against the capstone paper's Tables 14/15/17/18/19)
 * so the Design Parameters UI can show the real number that will actually
 * be used instead of a generic "Auto" placeholder.
 *
 * `storeys` is required for the column/footing defaults, which the paper
 * defines separately for 1-storey vs 2-storey buildings (Table 14/17) —
 * pass `null` when there's no specific project in context (e.g. the
 * admin's global defaults page) and both variants are shown instead.
 */
export function getEngineDefaults(storeys) {
  const isTwoStorey = storeys >= 2;
  return {
    columnWidth: isTwoStorey ? 0.25 : 0.20,
    columnDepth: isTwoStorey ? 0.25 : 0.20,
    columnHeight: isTwoStorey ? 6.0 : 3.0,
    columnCount: null, // taken from the DXF's own detected column count, not a fixed default
    beamWidth: 0.20,
    beamDepth: 0.30,
    beamLength: null, // derived from wall run length x storeys, not a fixed default
    footingWidth: 0.60,
    footingLength: 0.60,
    footingDepth: isTwoStorey ? 2.0 : 1.5,
    floorToFloorHeight: 3.0,
    stairWidth: 0.90,
    buildingHeight: storeys != null ? storeys * 3.0 : null,
    scaffoldingSetWidth: 1.8,
    scaffoldingSetHeight: 1.2,
    scaffoldingSetCount: null, // derived from perimeter x height / coverage, not a fixed default
    riserHeight: 0.18,
    treadDepth: 0.25,
    waistThickness: 0.15,
    stairRebarSpacing: 0.15,
  };
}

/** Both 1-storey and 2-storey variants, for contexts with no specific
 * project (e.g. admin global defaults) where storeys isn't known yet. */
export function getEngineDefaultsBothVariants() {
  return { oneStorey: getEngineDefaults(1), twoStorey: getEngineDefaults(2) };
}

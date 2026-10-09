/**
 * The engine's own fallback defaults (backend/engine/formulas.py, checked
 * against the paper's Tables 14/15/17/18/19), so Design Parameters can show the
 * real number instead of a generic "Auto". `storeys` is needed for column and
 * footing defaults, which the paper gives separately for 1- and 2-storey
 * (Tables 14/17). Pass `null` when there is no project (e.g. admin global
 * defaults) and both variants are shown.
 */
export function getEngineDefaults(storeys) {
  const isTwoStorey = storeys >= 2;
  return {
    columnWidth: isTwoStorey ? 0.25 : 0.20,
    columnDepth: isTwoStorey ? 0.25 : 0.20,
    columnHeight: isTwoStorey ? 6.0 : 3.0,
    columnCount: null, // taken from the DXF's own detected column count, not a fixed default
    // Second floor falls back to the ground floor's own size (see fieldPlaceholder)
    columnWidthSecond: isTwoStorey ? 0.25 : 0.20,
    columnDepthSecond: isTwoStorey ? 0.25 : 0.20,
    beamWidth: 0.20,
    beamDepth: 0.30,
    beamLength: null, // from the BEAM layer, else wall run length (not fixed)
    groundBeamLength: null, // from the FTBEAM layer, else none
    wallBarMm: 10, // CHB wall bars
    beamRebarDiameterMm: 16, // main bars, the engineer's 16mm
    columnBarMm: 16, // main bars
    columnTieMm: 10, // lateral ties
    beamStirrupMm: 10,
    footingWidth: 0.60,
    footingLength: 0.60,
    footingDepth: isTwoStorey ? 2.0 : 1.5, // below ground: column part below ground = depth - thickness
    footingThickness: 0.30, // the pad itself: concrete, footing rebar and side forms
    footingCount: null, // one per ground floor column (Column count)
    footingRebarKgPerM3: 100, // the engineer's handwritten sheet, 2026-10-04
    columnRebarKgPerM3: 180, // half 16mm main bars, half 10mm ties
    beamRebarKgPerM3: 160, // half 16mm main bars, half 10mm stirrups
    trussFramingKgPerM2: 17.5, // truss angle bar by weight (the engineer)
    angleBarKgPerM: 3.4, // 1/4" x 1.5" x 1.5" angle bar
    floorToFloorHeight: 3.0, // ground floor
    secondFloorHeight: 3.0, // same as the ground floor unless entered
    stairWidth: 0.90,
    buildingHeight: storeys != null ? storeys * 3.0 : null,
    scaffoldingSetWidth: 1.8,
    scaffoldingSetHeight: 1.2,
    formworkUses: 1, // price only: plywood and lumber price / uses
    scaffoldingUses: 4, // price only, engineers' figure (2026-10-03)
    scaffoldingSetCount: null, // derived from perimeter x height / coverage, not a fixed default
    riserHeight: 0.18,
    treadDepth: 0.25,
    waistThickness: 0.15,
    stairRebarSpacing: 0.15,
    groundSlabBarMm: 10,
    groundSlabBarSpacing: 0.30,
    secondSlabBarMm: 12,
    secondSlabBarSpacing: 0.15,
  };
}

/** Both 1-storey and 2-storey variants, for contexts with no project (e.g. admin global defaults). */
export function getEngineDefaultsBothVariants() {
  return { oneStorey: getEngineDefaults(1), twoStorey: getEngineDefaults(2) };
}

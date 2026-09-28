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
    beamRebarLength: null, // no default: zero unless entered from the beam schedule
    beamRebarDiameterMm: 12, // bar size used when a beam rebar length is entered
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

/** Both 1-storey and 2-storey variants, for contexts with no project (e.g. admin global defaults). */
export function getEngineDefaultsBothVariants() {
  return { oneStorey: getEngineDefaults(1), twoStorey: getEngineDefaults(2) };
}

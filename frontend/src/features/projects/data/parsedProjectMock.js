/**
 * Live cache of the active project's real parsed measurements + quantity
 * take-off, populated by `loadParsedProject()` (called from
 * ProjectResultsPage/MaterialEstimationPage after fetching
 * GET /api/projects/:id) — every consumer downstream of parsing (Results,
 * Material Estimation, Store Locator's baseline BOM, ...) reads these same
 * exported bindings, so populating them here is all that's needed to make
 * the whole read-only chain reflect real per-project data without touching
 * any of those components.
 *
 * Object/array exports are mutated in place (not reassigned) and primitive
 * exports use `let` — both are live ES module bindings, so every importer
 * sees the update on its next render without re-importing anything.
 */
// groundFloor/secondFloor stay null unless the project was uploaded with a
// real separate second-floor DXF (see backend engine's geometry2 param) —
// with only one file, "ground" and the combined total are the same number,
// so there's nothing honest to show as a distinct per-floor breakdown.
export const PARSED_MEASUREMENTS = {
  totalWallLength: '—', floorArea: '—', roofArea: '—', roomsDetected: 0,
  doorArea: '—', windowArea: '—', columnCount: '—', floorPerimeter: '—', roofPerimeter: '—', roofRidgeLength: '—',
  groundFloor: null, secondFloor: null,
};

export let ESTIMATED_COST = '₱0';
export let ESTIMATED_COST_VALUE = 0;

// Matches the material_key set the backend computes — see
// features/estimation/data/quantityTakeoffMaterials.js for the full
// take-off table (this module only carries what Results/Store Locator need).
export const MATERIALS = [];

// Exported so anything else rendering a quantity formats it identically —
// notably BillOfMaterialsPage, which gets raw numeric quantities from the
// backend's BOM endpoint and has to produce the same label this module
// already puts on MATERIALS.
export function formatQuantityLabel(quantity) {
  return Number(quantity).toLocaleString('en-PH', { maximumFractionDigits: 3 });
}

// Detail fields are only populated for projects computed after the
// "detailed extraction information" migration (009) — an older estimation
// row has these as NULL/undefined until it's recomputed, so this falls back
// to the placeholder "—" rather than rendering "null m²".
function formatDetail(value, suffix = '') {
  return value == null ? '—' : `${value}${suffix}`;
}

/**
 * @param {{ measurements: {totalWallLength:number, floorArea:number, roofArea:number, roomsDetected:number,
 *     doorArea?:number, windowArea?:number, columnCount?:number, floorPerimeter?:number, roofPerimeter?:number, roofRidgeLength?:number,
 *     groundFloor?: {wallLength:number, floorArea:number}, secondFloor?: {wallLength:number, floorArea:number}},
 *   materials: Array<{key:string, name:string, quantity:number, unit:string}>, estimatedCost: number }} estimation
 */
export function loadParsedProject(estimation) {
  const { measurements, materials, estimatedCost } = estimation;

  PARSED_MEASUREMENTS.totalWallLength = `${measurements.totalWallLength} m`;
  PARSED_MEASUREMENTS.floorArea = `${measurements.floorArea} m²`;
  PARSED_MEASUREMENTS.roofArea = `${measurements.roofArea} m²`;
  PARSED_MEASUREMENTS.roomsDetected = measurements.roomsDetected;
  PARSED_MEASUREMENTS.doorArea = formatDetail(measurements.doorArea, ' m²');
  PARSED_MEASUREMENTS.windowArea = formatDetail(measurements.windowArea, ' m²');
  PARSED_MEASUREMENTS.columnCount = formatDetail(measurements.columnCount);
  PARSED_MEASUREMENTS.floorPerimeter = formatDetail(measurements.floorPerimeter, ' m');
  PARSED_MEASUREMENTS.roofPerimeter = formatDetail(measurements.roofPerimeter, ' m');
  PARSED_MEASUREMENTS.roofRidgeLength = formatDetail(measurements.roofRidgeLength, ' m');
  PARSED_MEASUREMENTS.groundFloor = measurements.groundFloor
    ? { wallLength: `${measurements.groundFloor.wallLength} m`, floorArea: `${measurements.groundFloor.floorArea} m²` }
    : null;
  PARSED_MEASUREMENTS.secondFloor = measurements.secondFloor
    ? { wallLength: `${measurements.secondFloor.wallLength} m`, floorArea: `${measurements.secondFloor.floorArea} m²` }
    : null;

  ESTIMATED_COST_VALUE = estimatedCost;
  ESTIMATED_COST = `₱${Math.round(estimatedCost).toLocaleString('en-PH')}`;

  MATERIALS.length = 0;
  MATERIALS.push(
    ...materials.map((material) => ({
      key: material.key,
      name: material.name,
      quantity: material.quantity,
      quantityLabel: formatQuantityLabel(material.quantity),
      unit: material.unit,
    })),
  );
}

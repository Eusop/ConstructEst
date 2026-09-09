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
import { formatCount, formatMeasurement, formatPeso, formatQuantity } from '../../../utils/formatNumbers';
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

// Re-exported for the modules that already import it from here (e.g.
// BillOfMaterialsPage, which gets raw numeric quantities back from the
// backend's BOM endpoint) — the implementation now lives in utils/formatNumbers
// so all three copies of this logic that used to exist can't drift apart.
export { formatQuantity as formatQuantityLabel };

/**
 * @param {{ measurements: {totalWallLength:number, floorArea:number, roofArea:number, roomsDetected:number,
 *     doorArea?:number, windowArea?:number, columnCount?:number, floorPerimeter?:number, roofPerimeter?:number, roofRidgeLength?:number,
 *     groundFloor?: {wallLength:number, floorArea:number}, secondFloor?: {wallLength:number, floorArea:number}},
 *   materials: Array<{key:string, name:string, quantity:number, unit:string}>, estimatedCost: number }} estimation
 */
export function loadParsedProject(estimation) {
  const { measurements, materials, estimatedCost } = estimation;

  // Every measurement goes through formatMeasurement, which also covers the
  // detail fields that are NULL on projects computed before the "detailed
  // extraction information" migration (009) — those render "—" rather than
  // "null m²" until the project is recomputed. roomsDetected/columnCount are
  // genuine counts, so they never get decimals.
  PARSED_MEASUREMENTS.totalWallLength = formatMeasurement(measurements.totalWallLength, ' m');
  PARSED_MEASUREMENTS.floorArea = formatMeasurement(measurements.floorArea, ' m²');
  PARSED_MEASUREMENTS.roofArea = formatMeasurement(measurements.roofArea, ' m²');
  PARSED_MEASUREMENTS.roomsDetected = measurements.roomsDetected;
  PARSED_MEASUREMENTS.doorArea = formatMeasurement(measurements.doorArea, ' m²');
  PARSED_MEASUREMENTS.windowArea = formatMeasurement(measurements.windowArea, ' m²');
  PARSED_MEASUREMENTS.columnCount = formatCount(measurements.columnCount);
  PARSED_MEASUREMENTS.floorPerimeter = formatMeasurement(measurements.floorPerimeter, ' m');
  PARSED_MEASUREMENTS.roofPerimeter = formatMeasurement(measurements.roofPerimeter, ' m');
  PARSED_MEASUREMENTS.roofRidgeLength = formatMeasurement(measurements.roofRidgeLength, ' m');
  PARSED_MEASUREMENTS.groundFloor = measurements.groundFloor
    ? {
      wallLength: formatMeasurement(measurements.groundFloor.wallLength, ' m'),
      floorArea: formatMeasurement(measurements.groundFloor.floorArea, ' m²'),
    }
    : null;
  PARSED_MEASUREMENTS.secondFloor = measurements.secondFloor
    ? {
      wallLength: formatMeasurement(measurements.secondFloor.wallLength, ' m'),
      floorArea: formatMeasurement(measurements.secondFloor.floorArea, ' m²'),
    }
    : null;

  ESTIMATED_COST_VALUE = estimatedCost;
  ESTIMATED_COST = formatPeso(estimatedCost);

  MATERIALS.length = 0;
  MATERIALS.push(
    ...materials.map((material) => ({
      key: material.key,
      name: material.name,
      quantity: material.quantity,
      quantityLabel: formatQuantity(material.quantity, material.unit),
      unit: material.unit,
    })),
  );
}

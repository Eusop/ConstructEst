/**
 * Live cache of the active project's parsed measurements and quantity take-off,
 * filled by `loadParsedProject()` (called from ProjectResultsPage and
 * MaterialEstimationPage after GET /api/projects/:id). Everything after parsing
 * (Results, Material Estimation, Store Locator's baseline BOM) reads these same
 * exports, so filling them here updates all of it. Object and array exports are
 * mutated in place and primitives use `let`, both live ES module bindings, so
 * importers see updates on their next render.
 */
import { formatCount, formatMeasurement, formatPeso, formatQuantity } from '../../../utils/formatNumbers';
// groundFloor/secondFloor stay null unless the project had a separate second
// floor DXF (see geometry2 in the engine). With one file, "ground" and the
// total are the same number, so there is no per-floor breakdown to show.
export const PARSED_MEASUREMENTS = {
  totalWallLength: '—', floorArea: '—', roofArea: '—', roomsDetected: 0,
  doorArea: '—', windowArea: '—', columnCount: '—', floorPerimeter: '—', roofPerimeter: '—', roofRidgeLength: '—',
  groundFloor: null, secondFloor: null,
};

export let ESTIMATED_COST = '₱0';
export let ESTIMATED_COST_VALUE = 0;

// Matches the material_key set the backend computes. See
// features/estimation/data/quantityTakeoffMaterials.js for the full take-off
// (this module only carries what Results and Store Locator need).
export const MATERIALS = [];

// Re-exported for modules that import it from here (e.g. BillOfMaterialsPage).
// The implementation lives in utils/formatNumbers so the copies can't drift apart.
export { formatQuantity as formatQuantityLabel };

/**
 * @param {{ measurements: {totalWallLength:number, floorArea:number, roofArea:number, roomsDetected:number,
 *     doorArea?:number, windowArea?:number, columnCount?:number, floorPerimeter?:number, roofPerimeter?:number, roofRidgeLength?:number,
 *     groundFloor?: {wallLength:number, floorArea:number}, secondFloor?: {wallLength:number, floorArea:number}},
 *   materials: Array<{key:string, name:string, quantity:number, unit:string}>, estimatedCost: number }} estimation
 */
export function loadParsedProject(estimation) {
  const { measurements, materials, estimatedCost } = estimation;

  // Every measurement goes through formatMeasurement, which also covers detail
  // fields that are NULL on projects computed before migration 009 (they show a
  // dash placeholder until recomputed). roomsDetected and columnCount are counts,
  // so no decimals.
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

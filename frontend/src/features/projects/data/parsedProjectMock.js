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
export const PARSED_MEASUREMENTS = { totalWallLength: '—', floorArea: '—', roofArea: '—', roomsDetected: 0 };

export let ESTIMATED_COST = '₱0';
export let ESTIMATED_COST_VALUE = 0;

// Matches the material_key set the backend computes — see
// features/estimation/data/quantityTakeoffMaterials.js for the full
// take-off table (this module only carries what Results/Store Locator need).
export const MATERIALS = [];

function formatQuantityLabel(quantity) {
  return Number(quantity).toLocaleString('en-PH', { maximumFractionDigits: 3 });
}

/**
 * @param {{ measurements: {totalWallLength:number, floorArea:number, roofArea:number, roomsDetected:number},
 *   materials: Array<{key:string, name:string, quantity:number, unit:string}>, estimatedCost: number }} estimation
 */
export function loadParsedProject(estimation) {
  const { measurements, materials, estimatedCost } = estimation;

  PARSED_MEASUREMENTS.totalWallLength = `${measurements.totalWallLength} m`;
  PARSED_MEASUREMENTS.floorArea = `${measurements.floorArea} m²`;
  PARSED_MEASUREMENTS.roofArea = `${measurements.roofArea} m²`;
  PARSED_MEASUREMENTS.roomsDetected = measurements.roomsDetected;

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

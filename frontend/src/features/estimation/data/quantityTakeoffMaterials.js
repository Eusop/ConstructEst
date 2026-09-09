/**
 * Live cache of the active project's quantity take-off, populated by
 * `loadQuantityTakeoff()` (called from MaterialEstimationPage after
 * fetching GET /api/projects/:id) — QuantityTakeoffTable reads this array
 * each render, so populating it here is all that's needed for the table to
 * show the real per-project take-off without changing the table itself.
 *
 * `unitCost` is each material's cheapest catalog price (see the backend's
 * loadCurrentEstimation) — an indicative cost shown before a store/brand is
 * chosen; the real priced total comes later from Brand Selection.
 */
import { formatQuantity } from '../../../utils/formatNumbers';

export const QUANTITY_TAKEOFF_MATERIALS = [];

// Purely cosmetic row-dot color, keyed by material — the key set is fixed
// (matches the backend's 16 material_key values), so this stays static.
const MATERIAL_COLORS = {
  hollowBlocks: 'orange',
  cement: 'blue',
  sand: 'purple',
  gravel: 'purple',
  steelRebar: 'green',
  tieWire: 'green',
  roofingSheets: 'teal',
  purlins: 'teal',
  ridge: 'teal',
  flashing: 'teal',
  angleBar: 'teal',
  gutter: 'teal',
  plywood: 'orange',
  lumber: 'orange',
  steelProps: 'blue',
  scaffolding: 'blue',
};


/** @param {Array<{key:string, name:string, quantity:number, unit:string, basis:string, unitCost:number,
 *   sourceBreakdown?: {ground:number, second:number, roofing:number, shared:number}}>} materials
 *   `sourceBreakdown` — see backend/engine/formulas.py's SOURCE_CATEGORIES — only meaningfully
 *   non-zero across more than one bucket for a 2-storey project uploaded with a separate
 *   second-floor DXF; carried through unchanged so QuantityTakeoffTable's "By source" view
 *   can group without re-deriving anything. */
export function loadQuantityTakeoff(materials) {
  QUANTITY_TAKEOFF_MATERIALS.length = 0;
  QUANTITY_TAKEOFF_MATERIALS.push(
    ...materials.map((material) => ({
      key: material.key,
      name: material.name,
      quantity: material.quantity,
      quantityLabel: formatQuantity(material.quantity, material.unit),
      unit: material.unit,
      unitCost: material.unitCost,
      basis: material.basis,
      sourceBreakdown: material.sourceBreakdown ?? null,
      color: MATERIAL_COLORS[material.key] ?? 'blue',
    })),
  );
}

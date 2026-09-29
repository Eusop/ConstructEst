/**
 * Live cache of the active project's quantity take-off, filled by
 * `loadQuantityTakeoff()` (called from MaterialEstimationPage after GET
 * /api/projects/:id). QuantityTakeoffTable reads this array each render.
 * `unitCost` is each material's cheapest catalog price (see loadCurrentEstimation
 * in the backend). It is kept but no longer shown, since no store or brand is
 * picked at this point; real prices appear from Store Locator on.
 */
import { formatQuantity } from '../../../utils/formatNumbers';

export const QUANTITY_TAKEOFF_MATERIALS = [];

// Row-dot color per material. Cosmetic; the key set is fixed (the backend's 16
// material_key values), so this stays static.
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


/**
 * @param {Array<{key:string, name:string, quantity:number, unit:string, basis:string, unitCost:number, sourceBreakdown?: {ground:number, second:number, roofing:number, shared:number}}>} materials
 *   `sourceBreakdown` (see SOURCE_CATEGORIES in formulas.py) is only non-zero in more than one bucket for a 2-storey project with a separate second floor DXF. It is passed through so the "By source" view can group without re-deriving.
 */
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
      // Engine computation lines for "Show computation". Null on old estimations.
      steps: material.steps ?? null,
      color: MATERIAL_COLORS[material.key] ?? 'blue',
    })),
  );
}

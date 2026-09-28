/**
 * The fixed set of material types, one per `material_key` the engine produces
 * (see `material_meta` in engine/formulas.py and the material_brands rows in
 * db/seed.sql), so a brand added here matches the key used by the Quantity
 * Take-off, Brand Selection and Bill of Materials. Sand and Gravel are bulk
 * commodities: priced directly, with no brand selection (`is_commodity`).
 */
export const MATERIAL_CATALOG = [
  { key: 'hollowBlocks', name: 'CHB (Concrete Hollow Blocks)', unit: 'pcs', bulk: false },
  { key: 'cement', name: 'Cement', unit: 'bags', bulk: false },
  { key: 'sand', name: 'Sand', unit: 'm3', bulk: true },
  { key: 'gravel', name: 'Gravel', unit: 'm3', bulk: true },
  { key: 'steelRebar', name: 'Rebar', unit: 'tons', bulk: false },
  { key: 'tieWire', name: 'Tie Wire', unit: 'kg', bulk: false },
  { key: 'roofingSheets', name: 'Roofing', unit: 'sheets', bulk: false },
  { key: 'purlins', name: 'Purlins', unit: 'lengths', bulk: false },
  { key: 'ridge', name: 'Ridge', unit: 'lengths', bulk: false },
  { key: 'flashing', name: 'Flashing', unit: 'pcs', bulk: false },
  { key: 'angleBar', name: 'Angle Bar', unit: 'lengths', bulk: false },
  { key: 'gutter', name: 'Gutter', unit: 'pcs', bulk: false },
  { key: 'plywood', name: 'Plywood', unit: 'pcs', bulk: false },
  { key: 'lumber', name: 'Lumber', unit: 'bd.ft.', bulk: false },
  { key: 'steelProps', name: 'Steel Props', unit: 'pcs', bulk: false },
  { key: 'scaffolding', name: 'Scaffolding', unit: 'sets', bulk: false },
];

export function getMaterialDefinition(key) {
  return MATERIAL_CATALOG.find((material) => material.key === key);
}

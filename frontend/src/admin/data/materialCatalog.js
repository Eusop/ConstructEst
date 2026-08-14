/**
 * The fixed set of material types the system supports — a system constant,
 * not admin-managed data, so it's safe to show in full even before an admin
 * has added anything (see AddMaterialsDialog). Sand and Gravel are bulk
 * commodities: priced/availability directly, no brand selection.
 */
export const MATERIAL_CATALOG = [
  { key: 'chb', name: 'CHB', unit: 'pc', bulk: false },
  { key: 'cement', name: 'Cement', unit: 'bag', bulk: false },
  { key: 'sand', name: 'Sand', unit: 'cu.m', bulk: true },
  { key: 'gravel', name: 'Gravel', unit: 'cu.m', bulk: true },
  { key: 'rebar', name: 'Rebar', unit: 'kg', bulk: false },
  { key: 'wire', name: 'Wire', unit: 'kg', bulk: false },
  { key: 'roofing', name: 'Roofing', unit: 'sheet', bulk: false },
  { key: 'purlins', name: 'Purlins', unit: 'length', bulk: false },
  { key: 'ridge', name: 'Ridge', unit: 'length', bulk: false },
  { key: 'flashing', name: 'Flashing', unit: 'm', bulk: false },
  { key: 'angle', name: 'Angle Bar', unit: 'length', bulk: false },
  { key: 'plywood', name: 'Plywood', unit: 'pc', bulk: false },
  { key: 'lumber', name: 'Lumber', unit: 'pc', bulk: false },
  { key: 'props', name: 'Props', unit: 'pc', bulk: false },
  { key: 'scaffolding', name: 'Scaffolding', unit: 'set', bulk: false },
];

export function getMaterialDefinition(key) {
  return MATERIAL_CATALOG.find((material) => material.key === key);
}

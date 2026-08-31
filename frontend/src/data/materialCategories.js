/**
 * Construction-logical grouping of the engine's material_key set, used only
 * to group an otherwise flat 14-16-item mobile card list into collapsible
 * sections (see ManualBrandTable.jsx / QuantityTakeoffTable.jsx's mobile
 * branches) — purely a presentational grouping, not used by any pricing/
 * estimation logic. Mirrors the same "group related fields into an
 * Accordion" convention DesignParametersCard already uses.
 */
export const MATERIAL_CATEGORY_GROUPS = [
  { label: 'Structural', keys: ['hollowBlocks', 'cement', 'sand', 'gravel', 'steelRebar', 'tieWire'] },
  { label: 'Roofing', keys: ['roofingSheets', 'purlins', 'ridge', 'flashing', 'angleBar', 'gutter'] },
  { label: 'Formwork & Scaffolding', keys: ['plywood', 'lumber', 'steelProps', 'scaffolding'] },
];

/**
 * Splits `items` (each with a `key` matching one of MATERIAL_CATEGORY_GROUPS'
 * `keys`) into `{ label, items }` groups in the fixed category order above.
 * Items whose key isn't in any group are dropped silently — every real
 * material_key is covered above, so this only matters for defensive safety.
 *
 * @param {Array<{key: string}>} items
 * @param {(key: string) => any} [keyOf] Optional accessor if `key` isn't the item's own `key` field.
 */
export function groupMaterialsByCategory(items, keyOf = (item) => item.key) {
  return MATERIAL_CATEGORY_GROUPS.map((group) => ({
    label: group.label,
    items: items.filter((item) => group.keys.includes(keyOf(item))),
  })).filter((group) => group.items.length > 0);
}

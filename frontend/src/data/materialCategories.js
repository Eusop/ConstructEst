/**
 * Groups the engine's material keys by construction type, only to split the
 * long mobile card list into collapsible sections (see ManualBrandTable.jsx
 * and QuantityTakeoffTable.jsx). Presentation only; it does not affect pricing.
 */
export const MATERIAL_CATEGORY_GROUPS = [
  { label: 'Structural', keys: ['hollowBlocks', 'cement', 'sand', 'gravel', 'steelRebar', 'tieWire'] },
  { label: 'Roofing', keys: ['roofingSheets', 'purlins', 'ridge', 'flashing', 'angleBar', 'gutter'] },
  { label: 'Formwork & Scaffolding', keys: ['plywood', 'lumber', 'steelProps', 'scaffolding'] },
];

/**
 * Splits `items` (each with a `key` in MATERIAL_CATEGORY_GROUPS' `keys`) into
 * `{ label, items }` groups in the fixed order above. Items with no group are
 * dropped (every real material_key is covered, so this is just a safeguard).
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

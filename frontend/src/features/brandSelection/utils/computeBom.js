import { MATERIALS } from '../../projects/data/parsedProjectCache';
import { BASE_PRICING, OPTIMIZATION_TIERS, getStoreBrandOptions } from '../data/brandOptionsCache';

function resolveBrandOption(storeId, materialKey, optionId) {
  return getStoreBrandOptions(storeId, materialKey)?.find((option) => option.id === optionId) ?? null;
}

/**
 * Computes priced BOM line items and the grand total from brand choices
 * (`{ [materialKey]: brandOptionId }`) against one store's catalog: the 4
 * brand-selectable materials use their chosen option's price at that store, and
 * the rest use fixed `BASE_PRICING`. Both BrandSelectionPage (live preview) and
 * BillOfMaterialsPage (final BOM) call it, so neither keeps its own totals.
 *
 * @param {Record<string, string>} [choices] Defaults to the Standard tier.
 * @param {string|null} [storeId] Which store's catalog to price against;
 *   omit for the generic (unscaled) catalog, e.g. cross-store baselines.
 * @param {Record<string, number>|null} [realUnitPrices] materialKey -> the
 *   store's real price, taken from the backend's own BOM response. Only
 *   consulted for materials with no resolvable brand option, i.e. the
 *   commodities (sand/gravel), whose BASE_PRICING literals are flat and so
 *   disagree with the per-store prices the backend actually charges.
 */
export function computeBom(choices = OPTIMIZATION_TIERS.standard.choices, storeId = null, realUnitPrices = null) {
  const lineItems = MATERIALS.map((material) => {
    const base = BASE_PRICING[material.key];
    const brandOption = choices[material.key] ? resolveBrandOption(storeId, material.key, choices[material.key]) : null;
    // Falls back to 0 (unitPrice is undefined for non-commodities) when a material
    // has no brand at this store, e.g. it's unavailable or no choice was made.
    // Otherwise unitPrice stays undefined and crashes BomTable's formatNumber.
    const unitPrice = brandOption?.price ?? realUnitPrices?.[material.key] ?? base.unitPrice ?? 0;
    const brand = brandOption?.brand ?? base.brand;

    return {
      key: material.key,
      material: material.name.replace(/\s*\(.*\)$/, ''),
      category: base.category,
      brand,
      quantity: material.quantity,
      quantityLabel: material.quantityLabel,
      unit: material.unit,
      unitPrice,
      amount: material.quantity * unitPrice,
    };
  });

  const grandTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  return { lineItems, grandTotal };
}

/**
 * Computes just the total for a project's saved brand selection (or the
 * Standard tier if none), priced at its selected store. Used where only the
 * number is needed (e.g. the Projects list).
 *
 * @param {{ brandSelection?: { choices: Record<string, string> } | null, selectedStoreId?: string|null }} [project]
 */
export function computeBomForProject(project) {
  return computeBom(project?.brandSelection?.choices ?? OPTIMIZATION_TIERS.standard.choices, project?.selectedStoreId ?? null);
}

export function computeTierTotal(tierKey, storeId = null, realUnitPrices = null) {
  return computeBom(OPTIMIZATION_TIERS[tierKey].choices, storeId, realUnitPrices).grandTotal;
}

import { MATERIALS } from '../../projects/data/parsedProjectMock';
import { BASE_PRICING, OPTIMIZATION_TIERS, getStoreBrandOptions } from '../data/brandOptionsMock';

function resolveBrandOption(storeId, materialKey, optionId) {
  return getStoreBrandOptions(storeId, materialKey)?.find((option) => option.id === optionId) ?? null;
}

/**
 * Computes priced BOM line items + grand total from a set of brand choices
 * (`{ [materialKey]: brandOptionId }`), resolved against one store's brand
 * catalog — the 4 brand-selectable materials resolve to their chosen
 * option's price *at that store*; the rest always use their fixed
 * `BASE_PRICING`. This is the one place brand choices turn into real
 * numbers: both BrandSelectionPage (live preview while picking) and
 * BillOfMaterialsPage (final BOM) call it, so neither keeps its own static
 * totals — swapping this for a backend pricing API later only means
 * changing what's inside this function.
 *
 * @param {Record<string, string>} [choices] Defaults to the Standard tier.
 * @param {string|null} [storeId] Which store's catalog to price against;
 *   omit for the generic (unscaled) catalog, e.g. cross-store baselines.
 */
export function computeBom(choices = OPTIMIZATION_TIERS.standard.choices, storeId = null) {
  const lineItems = MATERIALS.map((material) => {
    const base = BASE_PRICING[material.key];
    const brandOption = choices[material.key] ? resolveBrandOption(storeId, material.key, choices[material.key]) : null;
    const unitPrice = brandOption?.price ?? base.unitPrice;
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
 * Standard tier, if it hasn't made one yet), priced against its selected
 * store — used wherever only the number is needed (e.g. the Projects list).
 *
 * @param {{ brandSelection?: { choices: Record<string, string> } | null, selectedStoreId?: string|null }} [project]
 */
export function computeBomForProject(project) {
  return computeBom(project?.brandSelection?.choices ?? OPTIMIZATION_TIERS.standard.choices, project?.selectedStoreId ?? null);
}

export function computeTierTotal(tierKey, storeId = null) {
  return computeBom(OPTIMIZATION_TIERS[tierKey].choices, storeId).grandTotal;
}

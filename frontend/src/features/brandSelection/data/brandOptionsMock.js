/**
 * Live cache of one store's real brand catalog, populated by
 * `loadBrandCatalog(storeId, catalog)` (called from BrandSelectionPage
 * after fetching GET /api/projects/:id/brand-catalog) — OptimizationTierCards,
 * RecommendedBrandsSummary, ManualBrandTable, and computeBom.js all read
 * `getStoreBrandOptions`/`OPTIMIZATION_TIERS` synchronously each render, so
 * populating the cache here is all that's needed for real per-store prices
 * to flow through the whole Brand Selection / BOM chain unchanged.
 */

// Sand/gravel are commodities with no brand catalog (see the backend's
// material_brands.is_commodity), so they never get a per-store price from
// getStoreBrandOptions the way every other material does. These flat 1300/1250
// literals are the seeded BASE price, i.e. store 1's — every other store
// applies its own multiplier (seed.sql), so using them as the real price made
// the Brand Selection totals and the Bill of Materials disagree with the
// Store Locator by ~P1.5-2.4k on a 2-storey house. Both pages now pass the
// store's real prices into computeBom as `realUnitPrices`, read off the
// backend's own BOM; these stay only as the fallback for when that request
// fails, so a hiccup degrades to the old numbers instead of showing P0.
export const BASE_PRICING = {
  hollowBlocks: { brand: '', category: 'Masonry' },
  cement: { brand: '', category: 'Cementitious' },
  sand: { brand: 'Local', category: 'Aggregate', unitPrice: 1300 },
  gravel: { brand: 'Local', category: 'Aggregate', unitPrice: 1250 },
  steelRebar: { brand: '', category: 'Reinforcement' },
  tieWire: { brand: '', category: 'Reinforcement' },
  roofingSheets: { brand: '', category: 'Roofing' },
  purlins: { brand: '', category: 'Roofing' },
  ridge: { brand: '', category: 'Roofing' },
  flashing: { brand: '', category: 'Roofing' },
  angleBar: { brand: '', category: 'Roofing' },
  gutter: { brand: '', category: 'Roofing' },
  plywood: { brand: '', category: 'Formwork' },
  lumber: { brand: '', category: 'Formwork' },
  steelProps: { brand: '', category: 'Formwork' },
  scaffolding: { brand: '', category: 'Formwork' },
};

export const BRAND_MATERIAL_SHORT_LABELS = {
  hollowBlocks: 'CHB',
  cement: 'Cement',
  steelRebar: 'Rebar',
  tieWire: 'Tie Wire',
  roofingSheets: 'Roofing',
  purlins: 'Purlins',
  ridge: 'Ridge',
  flashing: 'Flashing',
  angleBar: 'Angle Bar',
  gutter: 'Gutter',
  plywood: 'Plywood',
  lumber: 'Lumber',
  steelProps: 'Steel Props',
  scaffolding: 'Scaffolding',
};

export const BRAND_SELECTABLE_MATERIAL_KEYS = Object.keys(BRAND_MATERIAL_SHORT_LABELS);

// materialKey -> array of { id, brand, spec, price, quality, supplier } for
// whichever store was last loaded.
export const MATERIAL_BRAND_OPTIONS = {};
let currentStoreId = null;

export const OPTIMIZATION_TIERS = {
  premium: { key: 'premium', label: 'Premium', description: 'Higher-priced brands', choices: {} },
  standard: {
    key: 'standard',
    label: 'Standard',
    description: 'Mixed-price brands',
    recommended: true,
    choices: {},
  },
  budget: { key: 'budget', label: 'Budget', description: 'Lower-priced brands', choices: {} },
};

function pickPremium(options) {
  return [...options].sort((a, b) => b.quality - a.quality || b.price - a.price)[0];
}

function pickBudget(options) {
  return [...options].sort((a, b) => a.price - b.price)[0];
}

function pickStandard(options) {
  const byPrice = [...options].sort((a, b) => a.price - b.price);
  return byPrice[Math.floor((byPrice.length - 1) / 2)];
}

/**
 * @param {string|number} storeId
 * @param {Record<string, Array<{id:number, brand:string, spec:string, price:number, quality:number, supplier:string}>>} catalog
 */
export function loadBrandCatalog(storeId, catalog) {
  currentStoreId = storeId;

  Object.keys(MATERIAL_BRAND_OPTIONS).forEach((key) => delete MATERIAL_BRAND_OPTIONS[key]);
  Object.assign(MATERIAL_BRAND_OPTIONS, catalog);

  BRAND_SELECTABLE_MATERIAL_KEYS.forEach((materialKey) => {
    const options = catalog[materialKey];
    if (!options || options.length === 0) return;

    OPTIMIZATION_TIERS.premium.choices[materialKey] = pickPremium(options).id;
    OPTIMIZATION_TIERS.budget.choices[materialKey] = pickBudget(options).id;
    OPTIMIZATION_TIERS.standard.choices[materialKey] = pickStandard(options).id;
  });
}

export function getStoreBrandOptions(storeId, materialKey) {
  if (storeId !== currentStoreId) return [];
  return MATERIAL_BRAND_OPTIONS[materialKey] ?? [];
}

/**
 * Which brand-selectable materials the current project's catalog actually
 * has options for at this store — i.e. materials the project's estimation
 * needs at all (excludes e.g. roofing when a project has it toggled off,
 * since those never appear in the catalog GET returns in the first place).
 * Callers should render/resolve against this instead of the full static
 * BRAND_SELECTABLE_MATERIAL_KEYS list, which does not shrink per project.
 */
export function getAvailableMaterialKeys(storeId) {
  return BRAND_SELECTABLE_MATERIAL_KEYS.filter((key) => getStoreBrandOptions(storeId, key).length > 0);
}

export function getStoreBrandCatalog(storeId) {
  return Object.fromEntries(
    BRAND_SELECTABLE_MATERIAL_KEYS.map((materialKey) => [materialKey, getStoreBrandOptions(storeId, materialKey)]),
  );
}

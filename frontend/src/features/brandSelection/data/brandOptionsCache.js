/**
 * Live cache of one store's real brand catalog, filled by
 * `loadBrandCatalog(storeId, catalog)` (called from BrandSelectionPage after
 * GET /api/projects/:id/brand-catalog). OptimizationTierCards,
 * RecommendedBrandsSummary, ManualBrandTable and computeBom.js read
 * `getStoreBrandOptions`/`OPTIMIZATION_TIERS` each render, so filling the cache
 * here is all it takes for real per-store prices to flow through.
 */

// Sand and gravel are commodities with no brand catalog (backend
// material_brands.is_commodity), so getStoreBrandOptions has no per-store price
// for them. These flat 1300/1250 values are store 1's base price; other stores
// apply a multiplier (seed.sql). Both pages pass the store's real prices to
// computeBom as `realUnitPrices`; these are only the fallback when that request fails.
export const BASE_PRICING = {
  hollowBlocks: { brand: '', category: 'Masonry' },
  cement: { brand: '', category: 'Cementitious' },
  sand: { brand: 'Local', category: 'Aggregate', unitPrice: 1300 },
  gravel: { brand: 'Local', category: 'Aggregate', unitPrice: 1250 },
  steelRebar: { brand: '', category: 'Reinforcement' },
  rebar10mm: { brand: '', category: 'Reinforcement' },
  rebar12mm: { brand: '', category: 'Reinforcement' },
  rebar16mm: { brand: '', category: 'Reinforcement' },
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
  // Old estimates without bar counts still price rebar per ton.
  steelRebar: 'Rebar',
  rebar10mm: 'Rebar 10mm',
  rebar12mm: 'Rebar 12mm',
  rebar16mm: 'Rebar 16mm',
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

// materialKey -> array of { id, brand, spec, price, supplier } for the
// store last loaded.
export const MATERIAL_BRAND_OPTIONS = {};
let currentStoreId = null;

export const OPTIMIZATION_TIERS = {
  premium: { key: 'premium', label: 'Premium', description: 'Highest-priced brands', choices: {} },
  standard: {
    key: 'standard',
    label: 'Standard',
    description: 'Middle-priced brands',
    recommended: true,
    choices: {},
  },
  budget: { key: 'budget', label: 'Budget', description: 'Cheapest brands', choices: {} },
};

// All three tiers go by price only. The paper leaves material quality out of
// scope (Table 20 picks the lowest price), so there is no quality rating.
function pickPremium(options) {
  return [...options].sort((a, b) => b.price - a.price)[0];
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
 * @param {Record<string, Array<{id:number, brand:string, spec:string, price:number, supplier:string}>>} catalog
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

// Every active store's options (GET /projects/:id/brand-catalog/all-stores),
// for buying a material at another store (migration 038). storeId -> materialKey
// -> options, cheapest first. Includes sand and gravel.
export const ALL_STORE_OPTIONS = {};
// Active stores in name order: [{ id, name }].
export const ALL_STORES = [];

export function loadAllStoreCatalog(stores, catalog) {
  ALL_STORES.length = 0;
  ALL_STORES.push(...stores);
  Object.keys(ALL_STORE_OPTIONS).forEach((key) => delete ALL_STORE_OPTIONS[key]);
  Object.assign(ALL_STORE_OPTIONS, catalog);
}

export function getStoreBrandOptions(storeId, materialKey) {
  if (storeId === currentStoreId && MATERIAL_BRAND_OPTIONS[materialKey]) return MATERIAL_BRAND_OPTIONS[materialKey];
  return ALL_STORE_OPTIONS[storeId]?.[materialKey] ?? [];
}

/** Stores that carry this material, cheapest first: [{ id, name, price }]. */
export function getSupplierOptions(materialKey) {
  return ALL_STORES
    .map((store) => ({ id: store.id, name: store.name, price: ALL_STORE_OPTIONS[store.id]?.[materialKey]?.[0]?.price }))
    .filter((store) => store.price != null)
    .sort((a, b) => a.price - b.price);
}

export function getStoreName(storeId) {
  return ALL_STORES.find((store) => store.id === storeId)?.name ?? null;
}

/**
 * Which brand-selectable materials this project's catalog has options for at
 * this store, i.e. the ones the estimation needs (excludes e.g. roofing when
 * turned off). Use this instead of the full static BRAND_SELECTABLE_MATERIAL_KEYS,
 * which doesn't shrink per project.
 */
export function getAvailableMaterialKeys(storeId) {
  return BRAND_SELECTABLE_MATERIAL_KEYS.filter((key) => getStoreBrandOptions(storeId, key).length > 0);
}

export function getStoreBrandCatalog(storeId) {
  return Object.fromEntries(
    BRAND_SELECTABLE_MATERIAL_KEYS.map((materialKey) => [materialKey, getStoreBrandOptions(storeId, materialKey)]),
  );
}

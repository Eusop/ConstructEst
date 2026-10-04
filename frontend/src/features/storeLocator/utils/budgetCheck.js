// Budget ceiling checks shared by Store Locator and the Bill of Materials
// (FR-4, FR-7). Store totals use the cheapest in-stock brand of each material,
// so the cheapest fully stocked store is the closest the user can get to the
// ceiling.

/** The project's budget ceiling as a number, or null if none was set. */
export function parseCeiling(value) {
  const ceiling = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(ceiling) && ceiling > 0 ? ceiling : null;
}

/** Cheapest store that carries every material, or null. Uses the storesCache shape. */
export function cheapestFullStore(stores) {
  return stores
    .filter((store) => store.inStock && store.totalCost != null)
    .reduce((best, store) => (best == null || store.totalCost < best.totalCost ? store : best), null);
}

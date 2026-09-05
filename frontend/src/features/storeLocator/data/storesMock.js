/**
 * Live cache of the active project's real per-store cost comparison,
 * populated by `loadStores()` (called from StoreLocatorPage after fetching
 * GET /api/projects/:id/stores) — StoreLocatorPage and BillOfMaterialsPage
 * both read `STORES` directly each render, so populating it here is all
 * that's needed for the real per-store optimized totals (Table 20's cost
 * optimization logic) to show up without changing either page's rendering.
 */

// Tarlac City, Philippines — used as the map's default center before any
// store is selected, and as the distance-reference fallback (see
// haversineKm/loadStores below) whenever the browser's real geolocation
// isn't available (denied, unsupported, or timed out) — see
// hooks/useUserLocation.js, which StoreLocatorPage uses to get the user's
// actual position when possible.
const CITY_CENTER = { lat: 15.4802, lng: 120.5979 };

export const STORES = [];
export const CITY_LOCATION = CITY_CENTER;
// Set by loadStores() each time it runs — lets the UI say honestly whether
// "distance" is really from the user or just approximated from the city
// reference point.
export let DISTANCE_IS_FROM_USER = false;

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * @param {Array<{storeId:number, name:string, address:string, lat:number, lng:number,
 *   optimizedTotal:number|null, inStock:boolean, isCheapest:boolean,
 *   missingMaterials:Array<{materialKey:string,name:string,suggestedStoreId:number|null,suggestedStoreName:string|null}>}>} stores
 *   Already sorted cheapest-first by the backend.
 * @param {{lat:number,lng:number}} [origin] The point to measure distance from — the
 *   user's real browser geolocation when available (see hooks/useUserLocation.js),
 *   else the fixed city reference point (CITY_CENTER, the previous fallback-only
 *   behavior). Store positions themselves are already real (admin-entered coordinates).
 */
export function loadStores(stores, origin = CITY_CENTER) {
  DISTANCE_IS_FROM_USER = origin !== CITY_CENTER;
  STORES.length = 0;
  STORES.push(
    ...stores.map((store, index) => {
      const position = { lat: store.lat, lng: store.lng };
      const distanceKm = haversineKm(origin, position);
      const missing = store.missingMaterials[0];

      return {
        id: store.storeId,
        rank: index + 1,
        name: store.name,
        address: store.address,
        position,
        distanceKm,
        distanceLabel: `${distanceKm.toFixed(1)} km`,
        travelTimeLabel: `~${Math.max(1, Math.round((distanceKm / 30) * 60))} min drive`,
        totalCost: store.optimizedTotal,
        isCheapest: store.isCheapest,
        inStock: store.inStock,
        stockLabel: store.inStock ? 'All materials in stock' : `${store.missingMaterials.length} item(s) unavailable`,
        outOfStockMaterial: missing?.name ?? null,
        suggestedStoreName: missing?.suggestedStoreName ?? null,
      };
    }),
  );
}

/**
 * Live cache of the active project's per-store cost comparison, filled by
 * `loadStores()` (called from StoreLocatorPage after GET
 * /api/projects/:id/stores). StoreLocatorPage and BillOfMaterialsPage read
 * `STORES` each render, so filling it here shows the real per-store totals
 * (Table 20's cost optimization).
 */

// Tarlac City center: the map's default center before a store is selected, and
// the distance origin whenever the browser's location isn't available (see
// hooks/useUserLocation.js).
const CITY_CENTER = { lat: 15.4802, lng: 120.5979 };

export const STORES = [];
export const CITY_LOCATION = CITY_CENTER;
// Set by loadStores() each run, so the UI can say whether distance is from the
// user or from the city center.
export let DISTANCE_IS_FROM_USER = false;
// True once applyRoadDistances() gave at least one store a road distance.
export let DISTANCE_IS_BY_ROAD = false;

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
 * @param {Array<{storeId:number, name:string, address:string, lat:number, lng:number, optimizedTotal:number, inStock:boolean, isCheapest:boolean, missingMaterials:Array<{materialKey:string,name:string,availableAtStores:string[]}>}>} stores
 *   Already sorted (fully stocked cheapest first, then partially stocked).
 * @param {{lat:number,lng:number}} [origin] Where to measure distance from: the user's browser location when available (see hooks/useUserLocation.js), else the city center (CITY_CENTER). Store positions are real (admin-entered).
 */
export function loadStores(stores, origin = CITY_CENTER) {
  DISTANCE_IS_FROM_USER = origin !== CITY_CENTER;
  DISTANCE_IS_BY_ROAD = false;
  STORES.length = 0;
  STORES.push(
    ...stores.map((store, index) => {
      const position = { lat: store.lat, lng: store.lng };
      const distanceKm = haversineKm(origin, position);

      return {
        id: store.storeId,
        rank: index + 1,
        name: store.name,
        address: store.address,
        position,
        distanceKm,
        // Filled in by applyRoadDistances() when OpenRouteService answers.
        roadKm: null,
        roadMinutes: null,
        // Straight-line until the road distance arrives, and kept for any store
        // routing couldn't reach. The Directions button opens the road route in Google Maps.
        distanceLabel: `${distanceKm.toFixed(1)} km straight-line`,
        // Rough estimate: straight-line distance at an assumed 30 km/h.
        travelTimeLabel: `~${Math.max(1, Math.round((distanceKm / 30) * 60))} min drive (est.)`,
        totalCost: store.optimizedTotal,
        isCheapest: store.isCheapest,
        // "Fully stocked": still selectable either way; this only gates the
        // "Cheapest" badge and whether the missing-items warning shows.
        inStock: store.inStock,
        stockLabel: store.inStock ? 'All materials in stock' : `${store.missingMaterials.length} item(s) unavailable`,
        // Full list (not just the first): StoreListCard lists every missing material.
        missingMaterials: store.missingMaterials,
      };
    }),
  );
}

/**
 * Swaps in road distance and drive time from POST /api/stores/road-distances
 * (OpenRouteService). Stores missing from `byStoreId` keep straight-line labels.
 *
 * @param {Record<string, {km:number, minutes:number}>} byStoreId
 */
export function applyRoadDistances(byStoreId) {
  for (const store of STORES) {
    const road = byStoreId[store.id];
    if (!road) continue;
    store.roadKm = road.km;
    store.roadMinutes = road.minutes;
    store.distanceLabel = `${road.km.toFixed(1)} km by road`;
    store.travelTimeLabel = `~${road.minutes} min drive`;
    DISTANCE_IS_BY_ROAD = true;
  }
}

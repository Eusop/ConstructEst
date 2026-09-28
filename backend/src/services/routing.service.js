import { query } from '../config/db.js';

/**
 * Road distance and drive time from one origin to every active store, using
 * the OpenRouteService Matrix API (one request for all stores). Store Locator
 * shows straight-line first and swaps these in. When this returns
 * { available: false } (no key, quota used, timeout, bad response) the page
 * keeps the straight-line labels. Store coordinates come from the database.
 */

const ORS_MATRIX_URL = 'https://api.openrouteservice.org/v2/matrix/driving-car';
const REQUEST_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 60 * 60 * 1000;

// Cached by origin (rounded to ~110 m) plus the store list, so reloads within
// the hour don't use up the daily quota.
const cache = new Map();

function cacheKey(origin, stores) {
  const originPart = `${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}`;
  const storesPart = stores.map((s) => `${s.id}:${s.lat},${s.lng}`).join('|');
  return `${originPart}#${storesPart}`;
}

export async function getRoadDistances(origin) {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) return { available: false, reason: 'not-configured' };

  const rows = await query('SELECT id, lat, lng FROM stores WHERE is_active = 1 ORDER BY id');
  const stores = rows.map((row) => ({ id: row.id, lat: Number(row.lat), lng: Number(row.lng) }));
  if (stores.length === 0) return { available: true, byStoreId: {} };

  const key = cacheKey(origin, stores);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  try {
    const response = await fetch(ORS_MATRIX_URL, {
      method: 'POST',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      // ORS takes [lng, lat], the opposite order of our { lat, lng } objects.
      body: JSON.stringify({
        locations: [[origin.lng, origin.lat], ...stores.map((s) => [s.lng, s.lat])],
        sources: [0],
        destinations: stores.map((_, index) => index + 1),
        metrics: ['distance', 'duration'],
        units: 'km',
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.warn(`OpenRouteService matrix request failed: HTTP ${response.status}`);
      return { available: false, reason: `http-${response.status}` };
    }

    const data = await response.json();
    const distances = data?.distances?.[0];
    const durations = data?.durations?.[0];
    if (!Array.isArray(distances) || !Array.isArray(durations)) {
      console.warn('OpenRouteService matrix returned an unexpected shape.');
      return { available: false, reason: 'bad-response' };
    }

    const byStoreId = {};
    stores.forEach((store, index) => {
      const km = distances[index];
      const seconds = durations[index];
      // null = no route found to that point; the page keeps straight-line for it.
      if (km == null || seconds == null) return;
      byStoreId[store.id] = { km, minutes: Math.max(1, Math.round(seconds / 60)) };
    });

    const result = { available: true, byStoreId };
    cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (err) {
    console.warn(`OpenRouteService matrix request failed: ${err.name}: ${err.message}`);
    return { available: false, reason: err.name === 'TimeoutError' ? 'timeout' : 'network' };
  }
}

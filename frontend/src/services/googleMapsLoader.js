import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
let optionsSet = false;

function ensureOptionsSet() {
  if (optionsSet) return;
  setOptions({ key: API_KEY, v: 'weekly' });
  optionsSet = true;
}

/**
 * Whether a Google Maps API key has been configured (see .env.example).
 * Callers should check this before attempting to load, so a missing key
 * shows a clear fallback instead of a failed network request.
 */
export function hasGoogleMapsApiKey() {
  return Boolean(API_KEY);
}

/**
 * Loads a Google Maps JS API library (e.g. "maps", "marker"), lazily
 * setting the shared API key options on first call. Safe to call multiple
 * times/from multiple components — the underlying loader dedupes the
 * actual script injection.
 *
 * @param {'maps'|'marker'|'places'|'geometry'} libraryName
 */
export function loadGoogleMapsLibrary(libraryName) {
  ensureOptionsSet();
  return importLibrary(libraryName);
}

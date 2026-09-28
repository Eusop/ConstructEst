import { useCallback, useEffect, useRef, useState } from 'react';

// A fix worse than this usually means the browser used IP-based location
// instead of GPS/Wi-Fi, which can be off by hundreds of km. We check the
// reported accuracy since enableHighAccuracy can't force better.
const MAX_ACCEPTABLE_ACCURACY_M = 50_000;

// The app only serves Tarlac. A fix farther than 50 km from Tarlac City
// is treated as a wrong browser guess (usually IP based).
const TARLAC_CITY_CENTER = { lat: 15.4802, lng: 120.5979 };
const MAX_PLAUSIBLE_DISTANCE_KM = 50;

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
 * Wraps the browser Geolocation API so distances start from the user, not a
 * fixed city point. Fetches on mount; `refetch` is for the "locate me" button.
 *
 * It never hangs. When there is no usable location it says why, so the page
 * can tell the user instead of silently using another point:
 * - 'denied': permission refused.
 * - 'implausible': more than MAX_PLAUSIBLE_DISTANCE_KM from Tarlac City
 *   (usually a wrong IP guess); `rejectedDistanceKm` says how far.
 * - 'imprecise': reported accuracy worse than MAX_ACCEPTABLE_ACCURACY_M.
 * - 'unavailable': unsupported, failed, or the 10s failsafe fired.
 *
 * @returns {{ location: {lat:number,lng:number}|null,
 *   status: 'loading'|'granted'|'denied'|'implausible'|'imprecise'|'unavailable',
 *   rejectedDistanceKm: number|null, refetch: () => void }}
 */
export function useUserLocation() {
  const [state, setState] = useState({ location: null, status: 'loading', rejectedDistanceKm: null });
  // Bumped on every locate() so a slow older request can't overwrite a newer result.
  const requestIdRef = useRef(0);

  const locate = useCallback(() => {
    const requestId = ++requestIdRef.current;
    const setIfCurrent = (next) => {
      if (requestId === requestIdRef.current) setState(next);
    };
    // Deferred so this isn't a synchronous setState from the mount effect.
    queueMicrotask(() => setIfCurrent((prev) => ({ ...prev, status: 'loading' })));

    const none = (status, rejectedDistanceKm = null) => ({ location: null, status, rejectedDistanceKm });

    if (!navigator.geolocation) {
      queueMicrotask(() => setIfCurrent(none('unavailable')));
      return;
    }

    let settled = false;
    const settle = (next) => {
      if (settled || requestId !== requestIdRef.current) return;
      settled = true;
      queueMicrotask(() => setState(next));
    };

    const failsafe = setTimeout(() => settle(none('unavailable')), 10_000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(failsafe);
        const { latitude, longitude, accuracy } = position.coords;
        // Not expected from a normal browser (seen with extensions/emulators).
        // Treat as unavailable so bad values never reach the map.
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          settle(none('unavailable'));
          return;
        }
        // Too coarse to trust as "your location".
        if (Number.isFinite(accuracy) && accuracy > MAX_ACCEPTABLE_ACCURACY_M) {
          settle(none('imprecise'));
          return;
        }
        // Wrong but confident: small reported accuracy yet far from Tarlac.
        // The accuracy check above only catches fixes that admit they're rough.
        const kmFromTarlac = haversineKm(TARLAC_CITY_CENTER, { lat: latitude, lng: longitude });
        if (kmFromTarlac > MAX_PLAUSIBLE_DISTANCE_KM) {
          settle(none('implausible', Math.round(kmFromTarlac)));
          return;
        }
        settle({ location: { lat: latitude, lng: longitude }, status: 'granted', rejectedDistanceKm: null });
      },
      (error) => {
        clearTimeout(failsafe);
        settle(none(error?.code === 1 ? 'denied' : 'unavailable'));
      },
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  return { ...state, refetch: locate };
}

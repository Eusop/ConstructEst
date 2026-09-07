import { useCallback, useEffect, useRef, useState } from 'react';

// A fix worse than this usually means the browser fell back to IP-based
// geolocation instead of real GPS/Wi-Fi, which can be off by hundreds of
// km. enableHighAccuracy asks for better but can't force it, so we check
// the reported accuracy after the fact instead.
const MAX_ACCEPTABLE_ACCURACY_M = 50_000;

// This app's whole service area is Tarlac City. A fix landing way outside
// this radius is more likely a confidently-wrong IP geolocation (we saw a
// real case ~94km off with a small reported accuracy) than an actual user
// testing from far away, so we reject it too. Trade-off: a real user
// genuinely far from Tarlac also gets rejected here, fine for how narrow
// this app's scope is.
const TARLAC_CITY_CENTER = { lat: 15.4802, lng: 120.5979 };
const MAX_PLAUSIBLE_DISTANCE_KM = 100;

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
 * Wraps the browser Geolocation API to get a real distance-from-you figure
 * for the store list, instead of always measuring from a fixed city point.
 * Fetches once on mount, `refetch` re-triggers it for a "locate me" button.
 *
 * Falls back to `status: 'unavailable'` (never hangs) if: geolocation isn't
 * supported, permission is denied, the fetch fails, the fix is too coarse
 * to trust (see MAX_ACCEPTABLE_ACCURACY_M), the fix is confidently wrong
 * (small reported accuracy but way outside Tarlac, see
 * MAX_PLAUSIBLE_DISTANCE_KM), or a 10s failsafe timeout fires while a
 * permission prompt is still pending.
 *
 * @returns {{ location: {lat:number,lng:number}|null, status: 'loading'|'granted'|'unavailable', refetch: () => void }}
 */
export function useUserLocation() {
  const [state, setState] = useState({ location: null, status: 'loading' });
  // Bumped on every locate() call so a slow, superseded request (mount
  // fetch still pending when "locate me" fires a new one) can't overwrite
  // a newer result.
  const requestIdRef = useRef(0);

  const locate = useCallback(() => {
    const requestId = ++requestIdRef.current;
    const setIfCurrent = (next) => {
      if (requestId === requestIdRef.current) setState(next);
    };
    // Deferred so this isn't a synchronous setState when called from the
    // mount effect.
    queueMicrotask(() => setIfCurrent((prev) => ({ ...prev, status: 'loading' })));

    if (!navigator.geolocation) {
      queueMicrotask(() => setIfCurrent({ location: null, status: 'unavailable' }));
      return;
    }

    let settled = false;
    const settle = (next) => {
      if (settled || requestId !== requestIdRef.current) return;
      settled = true;
      queueMicrotask(() => setState(next));
    };

    const failsafe = setTimeout(() => settle({ location: null, status: 'unavailable' }), 10_000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(failsafe);
        const { latitude, longitude, accuracy } = position.coords;
        // Shouldn't happen from a normal browser, but seen from weird
        // extension/emulator setups. Treat it as unavailable instead of
        // passing garbage to the map (which would crash on it).
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          settle({ location: null, status: 'unavailable' });
          return;
        }
        // Too coarse to trust as "your location".
        if (Number.isFinite(accuracy) && accuracy > MAX_ACCEPTABLE_ACCURACY_M) {
          settle({ location: null, status: 'unavailable' });
          return;
        }
        // Confidently wrong: small reported accuracy but nowhere near
        // Tarlac. The accuracy check above only catches fixes that admit
        // they're coarse, not this.
        if (haversineKm(TARLAC_CITY_CENTER, { lat: latitude, lng: longitude }) > MAX_PLAUSIBLE_DISTANCE_KM) {
          settle({ location: null, status: 'unavailable' });
          return;
        }
        settle({ location: { lat: latitude, lng: longitude }, status: 'granted' });
      },
      () => {
        clearTimeout(failsafe);
        settle({ location: null, status: 'unavailable' });
      },
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  return { ...state, refetch: locate };
}

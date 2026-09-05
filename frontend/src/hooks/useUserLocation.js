import { useCallback, useEffect, useRef, useState } from 'react';

// A fix coarser than this isn't just "a bit off" — it's the classic
// symptom of the OS/browser falling back to IP-based geolocation (which
// can misplace a user by hundreds or thousands of km, sometimes in a
// different country entirely) rather than a real GPS/Wi-Fi-based reading.
// enableHighAccuracy asks for better, but can't force the OS to actually
// have it — this is the only way to tell after the fact that what came
// back isn't trustworthy enough to confidently label "your location".
const MAX_ACCEPTABLE_ACCURACY_M = 50_000;

// This app's entire service area is Tarlac City (every seeded hardware
// store, the paper's case study, all of it) — a fix landing much further
// than this from it is more likely IP-geolocation confidently reporting
// the wrong place (observed: a fix ~94km off with a small self-reported
// accuracy — the accuracy check above doesn't catch a *confidently* wrong
// fix, only ones that admit they're coarse) than a genuine user testing
// from somewhere distant. Trade-off worth knowing: a real user genuinely
// far from Tarlac would also get the fallback here — acceptable for a
// tool this narrowly scoped, revisit if that scope ever changes.
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
 * Wraps the browser Geolocation API for a real "distance from you" figure
 * (see features/storeLocator/data/storesMock.js's loadStores) instead of
 * the previous fixed Tarlac City reference point every user's distance was
 * silently measured from. Fetches once on mount, and exposes `refetch` for
 * an explicit "locate me" button (see MapView.jsx's locate control) — e.g.
 * if the first fix was coarse (common on desktop without GPS) or the user
 * has moved since.
 *
 * Settles to `status: 'unavailable'` (never hangs) on: the API not existing
 * (non-secure context, unsupported browser), the user denying/dismissing
 * the permission prompt, a real position fetch failure, a "successful" fix
 * too coarse to trust (see MAX_ACCEPTABLE_ACCURACY_M — the classic symptom
 * of IP-based geolocation landing in the wrong country), a "successful" fix
 * that's *confidently* wrong — small reported accuracy, but implausibly far
 * from this app's Tarlac City service area (see MAX_PLAUSIBLE_DISTANCE_KM,
 * which the accuracy check alone can't catch) — or a manual 10s failsafe
 * timeout in case the browser's own `timeout` option doesn't fire while a
 * permission decision is still pending — callers always have a sensible
 * default (the city reference point) to fall back to instead of blocking
 * forever on a prompt nobody answers, or trusting a wildly wrong fix.
 *
 * `enableHighAccuracy: true` asks for GPS/precise Wi-Fi positioning rather
 * than the browser's fast default (coarse IP/cell-tower lookup, which on
 * desktop can be off by tens of km); `maximumAge: 0` never reuses a stale
 * cached fix, so a `refetch` always attempts a genuinely new reading.
 *
 * @returns {{ location: {lat:number,lng:number}|null, status: 'loading'|'granted'|'unavailable', refetch: () => void }}
 */
export function useUserLocation() {
  const [state, setState] = useState({ location: null, status: 'loading' });
  // Bumped on every locate() call so a slow, superseded earlier request
  // (e.g. the initial mount fetch still pending when a "locate me" click
  // fires a fresh one) can't clobber a newer result once it finally settles.
  const requestIdRef = useRef(0);

  const locate = useCallback(() => {
    const requestId = ++requestIdRef.current;
    const setIfCurrent = (next) => {
      if (requestId === requestIdRef.current) setState(next);
    };
    // Deferred a tick rather than called synchronously — avoids the
    // cascading-render lint rule when this runs from the mount effect;
    // harmless (and imperceptible) when called from a button click instead.
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
        // Defensive: a well-behaved browser never hands back a non-finite
        // coordinate here, but this has been observed from odd browser/
        // extension/emulation states — treat it the same as "couldn't get
        // a location" rather than passing garbage on to the map, which
        // would otherwise throw deep inside Leaflet and crash the page.
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          settle({ location: null, status: 'unavailable' });
          return;
        }
        // A "successful" fix that's off by tens/hundreds of km is worse
        // than admitting we don't know — it gets labeled "your location"
        // and trusted for real distance figures otherwise. Reject it the
        // same as a failed fetch rather than confidently show a wrong
        // country as "You".
        if (Number.isFinite(accuracy) && accuracy > MAX_ACCEPTABLE_ACCURACY_M) {
          settle({ location: null, status: 'unavailable' });
          return;
        }
        // Catches a fix that's confidently wrong (small reported accuracy,
        // but nowhere near where this app's users actually are) — the
        // accuracy check above only catches ones that admit they're coarse.
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

import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import LocationOffRoundedIcon from '@mui/icons-material/LocationOffRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';
import { colors } from '../theme/palette';

function isValidLatLng(point) {
  return Boolean(point) && Number.isFinite(point.lat) && Number.isFinite(point.lng);
}

function FallbackState({ icon, title, description }) {
  return (
    <Stack
      spacing={1}
      sx={{
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 3,
        bgcolor: colors.heroBackground,
      }}
    >
      {icon}
      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary' }}>{title}</Typography>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', maxWidth: 320 }}>{description}</Typography>
    </Stack>
  );
}

/**
 * Reusable map: renders markers from plain data on free OpenStreetMap tiles
 * (via Leaflet) and opens a popup with per-marker HTML content on click.
 * Domain-agnostic — callers (Store Locator, Admin Stores, or any future map
 * feature) supply their own marker data and info content; this component
 * knows nothing about stores or projects.
 *
 * No API key needed (unlike the Google Maps version this replaced) — plain
 * markers + a popup was the entire feature surface actually used, and OSM's
 * standard tile server covers that for free, so there's no missing-key
 * fallback state to worry about, only a genuine load-failure one (e.g. no
 * network reaching the tile server).
 *
 * @param {object} props
 * @param {{lat: number, lng: number}} props.center
 * @param {number} [props.zoom=14]
 * @param {Array<{id: string, position: {lat: number, lng: number}, label?: string, color?: string, selected?: boolean}>} props.markers
 * @param {(id: string) => void} [props.onMarkerClick]
 * @param {(lat: number, lng: number) => void} [props.onMapClick] Fires on a plain click
 *   anywhere on the map (not a marker) — e.g. StoreFormDialog's click-to-drop-pin picker.
 * @param {(id: string) => string} [props.getInfoContent] Returns the HTML string shown in a marker's popup.
 * @param {string} [props.selectedMarkerId] Pans to and opens the popup for this marker when it changes.
 * @param {() => void} [props.onLocateRequest] When provided, shows a "locate me" button (top-right,
 *   like the standard map convention) that calls this on click — the caller re-fetches the user's
 *   real position (e.g. hooks/useUserLocation.js's `refetch`), which then flows back down through
 *   the `center` prop to actually pan the map; this component doesn't fetch geolocation itself.
 * @param {boolean} [props.isLocating] Shows a spinner on the locate button instead of its icon.
 * @param {string|number} [props.height=360]
 */
function MapView({ center, zoom = 14, markers, onMarkerClick, onMapClick, getInfoContent, selectedMarkerId, onLocateRequest, isLocating, height = 360 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerObjectsRef = useRef(new Map());
  const [status, setStatus] = useState('loading');

  // Kept fresh every render without needing `onMapClick` in the mount-only
  // effect's dependency array below (same reasoning as that effect already
  // documents for center/zoom) — updated in an effect rather than directly
  // during render, since writing a ref's `.current` during render itself
  // isn't allowed.
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  });

  // Skips the very first run of the re-center effect below, right after
  // mount — L.map()'s own constructor already placed it at `center`
  // directly (no pixel-space animation involved), so flying there again is
  // both redundant and the most fragile possible moment to do it: the
  // container may not have real layout dimensions yet this early, which is
  // exactly when flyTo's internal math can go NaN (see that effect).
  const skipNextRecenterRef = useRef(true);
  // True while a flyTo triggered by the center-change effect below is in
  // flight — read by the marker-rebuild effect so a marker list change
  // that happens to land in the same commit as a recenter (e.g. selecting
  // a store changes both at once) creates its fresh markers already
  // hidden, instead of undoing the center-effect's hide-for-the-animation
  // a moment after it set it (whichever effect runs second would otherwise
  // win, and that's not reliably this one).
  const isRecenteringRef = useRef(false);

  // Create the map instance once, on mount.
  useEffect(() => {
    if (!containerRef.current) return undefined;
    // React StrictMode (dev only) deliberately mounts, cleans up, and
    // remounts every effect once — Leaflet tags its container with a
    // `_leaflet_id` and throws "Map container is already initialized" if
    // that tag is still set from the first pass, so clear it defensively
    // before creating a new instance.
    if (containerRef.current._leaflet_id) {
      containerRef.current._leaflet_id = null;
    }
    let map;
    try {
      // Falls back to [0, 0] if the caller's initial center is somehow
      // invalid — better than throwing "Invalid LatLng" out of L.map()
      // and taking the whole page down with it (see isValidLatLng).
      const initialCenter = isValidLatLng(center) ? [center.lat, center.lng] : [0, 0];
      map = L.map(containerRef.current, {
        center: initialCenter,
        zoom,
        zoomControl: true,
        // Canvas instead of the default SVG renderer for vector layers
        // (our markers are all L.circleMarker) — SVG markers are
        // DOM/path-based and can visibly lag a frame or two behind the
        // map's own CSS zoom transform during an animated zoom (flyTo),
        // making them appear to jump away from their real position and
        // then snap back once the animation settles. Canvas redraws each
        // marker's pixel position fresh every animation frame instead, so
        // it tracks the zoom smoothly with no detach-and-correct glitch.
        preferCanvas: true,
        // A store locator for one city/region never legitimately needs to
        // zoom out to a whole-world view — and below roughly zoom 3, the
        // map is narrower than the viewport, so Leaflet tiles in repeated
        // copies of the world side by side to fill the gap (normal tile
        // behavior, but pointless and confusing here). Floors zoom well
        // above that threshold so the world never visibly repeats.
        minZoom: 5,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      map.on('click', (event) => onMapClickRef.current?.(event.latlng.lat, event.latlng.lng));
      mapRef.current = map;
      // Deferred a tick (not called synchronously in the effect body) —
      // avoids the cascading-render lint rule for setState-in-effect;
      // still resolves before the next paint, so there's no visible delay.
      queueMicrotask(() => setStatus('ready'));
    } catch (error) {
      console.error('Failed to initialize map:', error);
      queueMicrotask(() => setStatus('error'));
    }

    // Leaflet needs to be told explicitly when its container's size
    // changes (e.g. a flex/tab layout settling after first paint) — without
    // this it can render at a stale size and show gray/blank tiles until
    // the next manual pan or zoom.
    const resizeObserver = new ResizeObserver(() => map?.invalidateSize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map?.remove();
      mapRef.current = null;
    };
    // Intentionally only on mount — center/zoom below just pan the existing map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-center (and reset zoom) when the caller's center prop actually
  // changes (e.g. selecting a store, or "locate me") — resets zoom rather
  // than just panning so the view doesn't stay stuck at whatever level was
  // last left from unrelated manual zooming, always landing back at a
  // consistent, sensible level. flyTo animates the pan+zoom smoothly
  // instead of snapping instantly, so selecting a store visibly "zooms in"
  // on it rather than just teleporting the view there. Depends on the
  // lat/lng values themselves rather than the `center` object — callers
  // typically build that object inline on every render, so comparing by
  // reference would re-trigger (and replay the animation) on any unrelated
  // re-render, fighting the user's own subsequent zoom/pan.
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return;
    if (skipNextRecenterRef.current) {
      skipNextRecenterRef.current = false;
      return;
    }
    const lat = center.lat;
    const lng = center.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.error('MapView: ignoring invalid center', { lat, lng });
      return;
    }
    const map = mapRef.current;
    // flyTo does its animation in pixel space, computed from the
    // container's current size — if that's stale or transiently zero (a
    // narrow/mobile layout not fully settled yet is enough to trigger it),
    // the math produces NaN internally and flyTo throws "Invalid LatLng",
    // even though lat/lng/zoom here are already confirmed valid. Refresh
    // the size first as the actual fix; wrap in try/catch as a safety net
    // so this can never crash the page even if that's not enough on some
    // browser/viewport combination — an instant, unanimated move still
    // lands in the right place.
    map.invalidateSize();

    // Vector layers (our markers are all L.circleMarker) recompute their
    // pixel position on every frame of a continuous zoom animation like
    // flyTo, and that recalculation visibly lags a frame behind the map's
    // own transform — a long-standing Leaflet limitation, not something a
    // renderer choice fixes. Hiding them for the animation's duration and
    // letting them reappear once it settles ('moveend') reads as an
    // intentional "arriving" effect instead of the markers visibly
    // detaching from their real position and snapping back.
    const markerObjects = markerObjectsRef.current;
    const showMarkers = () => {
      isRecenteringRef.current = false;
      markerObjects.forEach((marker) => marker.setStyle({ opacity: 1, fillOpacity: 1 }));
    };
    try {
      isRecenteringRef.current = true;
      markerObjects.forEach((marker) => marker.setStyle({ opacity: 0, fillOpacity: 0 }));
      map.once('moveend', showMarkers);
      map.flyTo([lat, lng], zoom, { duration: 0.8 });
    } catch (error) {
      console.error('MapView: flyTo failed, falling back to an instant move', error);
      showMarkers();
      try {
        map.setView([lat, lng], zoom, { animate: false });
      } catch {
        // Nothing more to do — already logged above.
      }
    }
  }, [status, center.lat, center.lng, zoom]);

  // Rebuild markers whenever the marker list (or its selected flags) changes.
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return undefined;
    const markerObjects = markerObjectsRef.current;

    markerObjects.forEach((marker) => marker.remove());
    markerObjects.clear();

    markers.forEach((markerData) => {
      if (!isValidLatLng(markerData.position)) {
        console.error('MapView: skipping marker with invalid position', markerData);
        return;
      }
      // Created already-hidden if a recenter animation is currently in
      // flight (see isRecenteringRef) — a marker-list change landing in
      // the same commit as a recenter (e.g. selecting a store) would
      // otherwise recreate fresh, fully-visible markers a moment after the
      // center-effect hid the old ones, undoing that hide before the
      // animation even finishes.
      const initialOpacity = isRecenteringRef.current ? 0 : 1;
      const marker = L.circleMarker([markerData.position.lat, markerData.position.lng], {
        radius: markerData.selected ? 14 : 11,
        fillColor: markerData.color ?? colors.accentBlue,
        opacity: initialOpacity,
        fillOpacity: initialOpacity,
        color: '#fff',
        weight: 2,
      }).addTo(mapRef.current);

      if (markerData.label) {
        marker.bindTooltip(markerData.label, {
          permanent: true,
          direction: 'center',
          className: 'map-marker-label',
        });
      }

      marker.on('click', () => {
        onMarkerClick?.(markerData.id);
        if (getInfoContent) marker.bindPopup(getInfoContent(markerData.id)).openPopup();
      });

      markerObjects.set(markerData.id, marker);
    });

    return () => {
      markerObjects.forEach((marker) => marker.remove());
      markerObjects.clear();
    };
  }, [status, markers, onMarkerClick, getInfoContent]);

  // Open the popup when selection changes from outside the map (e.g. the
  // store list) — panning/zooming there is the `center`-driven effect
  // above's job (it animates smoothly via flyTo); re-panning here too,
  // instantly, would cut that animation short every time.
  useEffect(() => {
    if (status !== 'ready' || !selectedMarkerId || !getInfoContent) return;
    const marker = markerObjectsRef.current.get(selectedMarkerId);
    if (!marker) return;
    marker.bindPopup(getInfoContent(selectedMarkerId)).openPopup();
  }, [status, selectedMarkerId, getInfoContent]);

  return (
    <Box sx={{ position: 'relative', height, borderRadius: 2, overflow: 'hidden' }}>
      <Box ref={containerRef} sx={{ position: 'absolute', inset: 0, display: status === 'ready' ? 'block' : 'none' }} />

      {status === 'ready' && onLocateRequest && (
        <Tooltip title="Show your location" placement="left">
          <IconButton
            onClick={onLocateRequest}
            disabled={isLocating}
            size="small"
            aria-label="Show your location"
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: 1000,
              bgcolor: 'common.white',
              boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
              '&:hover': { bgcolor: 'grey.100' },
            }}
          >
            {isLocating ? <CircularProgress size={18} /> : <MyLocationRoundedIcon fontSize="small" sx={{ color: colors.accentBlue }} />}
          </IconButton>
        </Tooltip>
      )}

      {status === 'error' && (
        <FallbackState
          icon={<LocationOffRoundedIcon sx={{ fontSize: 32, color: 'text.disabled' }} />}
          title="Couldn't load the map"
          description="Check your internet connection, then reload the page."
        />
      )}
    </Box>
  );
}

export default MapView;

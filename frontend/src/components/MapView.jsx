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
 * Reusable map component using Leaflet + free OpenStreetMap tiles, no API
 * key needed. Just renders markers from plain data and shows a popup on
 * click, doesn't know anything about stores/projects, any page can use it.
 *
 * @param {object} props
 * @param {{lat: number, lng: number}} props.center
 * @param {number} [props.zoom=14]
 * @param {Array<{id: string, position: {lat: number, lng: number}, label?: string, color?: string, selected?: boolean}>} props.markers
 * @param {(id: string) => void} [props.onMarkerClick]
 * @param {(lat: number, lng: number) => void} [props.onMapClick] Fires on a plain map click, used for click-to-drop-pin.
 * @param {(id: string) => string} [props.getInfoContent] HTML string for a marker's popup.
 * @param {string} [props.selectedMarkerId] Pans to and opens the popup for this marker.
 * @param {() => void} [props.onLocateRequest] Shows a "locate me" button that calls this on click.
 * @param {boolean} [props.isLocating] Shows a spinner on the locate button.
 * @param {string|number} [props.height=360]
 */
function MapView({ center, zoom = 14, markers, onMarkerClick, onMapClick, getInfoContent, selectedMarkerId, onLocateRequest, isLocating, height = 360 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerObjectsRef = useRef(new Map());
  const [status, setStatus] = useState('loading');

  // Keeps onMapClick fresh for the mount-only effect below without adding
  // it to that effect's deps. Can't write to a ref during render, so it's
  // done in its own effect.
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  });

  // Skip the first run of the recenter effect, since L.map() already put
  // the map at `center` on creation, flying there again is redundant and
  // risky (container might not have real dimensions yet, see that effect).
  const skipNextRecenterRef = useRef(true);
  // True while a flyTo animation is running. The marker-rebuild effect
  // checks this so a marker list change during a recenter (like selecting
  // a store, which changes both at once) creates markers already hidden
  // instead of undoing the fade-out mid-animation.
  const isRecenteringRef = useRef(false);

  // Create the map instance once, on mount.
  useEffect(() => {
    if (!containerRef.current) return undefined;
    // React StrictMode mounts/unmounts/remounts every effect once in dev,
    // and Leaflet throws if it sees its old container id still set.
    if (containerRef.current._leaflet_id) {
      containerRef.current._leaflet_id = null;
    }
    let map;
    try {
      // Fall back to [0, 0] instead of crashing if center is invalid.
      const initialCenter = isValidLatLng(center) ? [center.lat, center.lng] : [0, 0];
      map = L.map(containerRef.current, {
        center: initialCenter,
        zoom,
        zoomControl: true,
        // Canvas renderer instead of the default SVG, our markers lag
        // behind during an animated zoom otherwise (SVG can't keep up with
        // the map's own CSS transform, canvas redraws every frame).
        preferCanvas: true,
        // Below zoom 3 or so Leaflet repeats the world map to fill the
        // screen. We never need to zoom out that far, so floor it above
        // that threshold.
        minZoom: 5,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      map.on('click', (event) => onMapClickRef.current?.(event.latlng.lat, event.latlng.lng));
      mapRef.current = map;
      // Deferred so this isn't a synchronous setState in the effect body.
      queueMicrotask(() => setStatus('ready'));
    } catch (error) {
      console.error('Failed to initialize map:', error);
      queueMicrotask(() => setStatus('error'));
    }

    // Leaflet needs to be told when its container resizes (like a tab
    // layout settling after first paint), otherwise it can render at a
    // stale size with gray tiles until the next pan/zoom.
    const resizeObserver = new ResizeObserver(() => map?.invalidateSize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map?.remove();
      mapRef.current = null;
    };
    // Mount-only on purpose, center/zoom changes are handled below instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pan/zoom to the new center whenever it actually changes (selecting a
  // store, "locate me", etc). Always resets zoom too so the view doesn't
  // stay wherever the user last manually zoomed to. flyTo animates this
  // smoothly instead of snapping. Depends on lat/lng directly rather than
  // the center object, since callers usually build that object fresh every
  // render, which would replay the animation on unrelated re-renders.
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
    // flyTo's animation math can go NaN if the container's size is stale
    // or zero (happens on a narrow layout that hasn't settled yet), even
    // with valid coordinates. invalidateSize() fixes that; try/catch is a
    // safety net so it can never crash the page, just falls back to an
    // instant move.
    map.invalidateSize();

    // Our markers (circleMarker) visibly lag a frame behind the map during
    // a flyTo animation, a known Leaflet limitation. Hiding them until the
    // animation settles reads as an intentional fade instead of a glitch.
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
        // Already logged above, nothing more to do.
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
      // Start hidden if a recenter animation is already running, so a
      // marker list change in the same commit as a recenter doesn't undo
      // the fade-out before the animation finishes.
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

  // Open the popup when selection changes from outside the map (like the
  // store list). Doesn't re-pan here, the center effect above already
  // handles that with a smooth flyTo, panning again would cut it short.
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

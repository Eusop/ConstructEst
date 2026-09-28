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
 * Reusable map using Leaflet and free OpenStreetMap tiles (no API key). It
 * renders markers from plain data and shows a popup on click, and knows nothing
 * about stores or projects.
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

  // Keeps onMapClick current for the mount-only effect below without adding it
  // to that effect's deps (a ref can't be written during render).
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  });

  // Skip the first run of the recenter effect: L.map() already placed the map at
  // `center`, and flying there again is redundant and risky.
  const skipNextRecenterRef = useRef(true);
  // True while a flyTo animation runs. The marker rebuild checks it so markers
  // created during a recenter start hidden instead of undoing the fade-out.
  const isRecenteringRef = useRef(false);

  // Create the map instance once, on mount.
  useEffect(() => {
    if (!containerRef.current) return undefined;
    // React StrictMode remounts every effect once in dev, and Leaflet throws if
    // the old container id is still set.
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
        // Canvas renderer instead of SVG: SVG markers lag behind the map's CSS
        // transform during an animated zoom, canvas redraws every frame.
        preferCanvas: true,
        // Below zoom 3 Leaflet repeats the world map. We never need that far
        // out, so the minimum is set above it.
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

    // Leaflet must be told when its container resizes (e.g. a tab layout
    // settling), or it can show a stale size with gray tiles.
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

  // Pan/zoom to the new center when it changes (selecting a store, "locate
  // me"). Zoom always resets so it doesn't stay where the user last zoomed.
  // Depends on lat/lng, not the center object, since callers build a new
  // object every render and that would replay the animation.
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
    // flyTo can produce NaN if the container size is stale or zero (narrow
    // layouts not yet settled). invalidateSize() fixes it, and try/catch falls
    // back to an instant move so it can't crash the page.
    map.invalidateSize();

    // circleMarker markers lag a frame behind during flyTo (a Leaflet limit).
    // Hiding them until it settles looks like an intentional fade.
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
      // Start hidden if a recenter is already running, so a marker change in
      // the same commit doesn't undo the fade-out.
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

  // Open the popup when selection changes from outside the map (e.g. the store
  // list). No re-pan here; the center effect above already flies there.
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

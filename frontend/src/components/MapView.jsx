import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LocationOffRoundedIcon from '@mui/icons-material/LocationOffRounded';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';
import { colors } from '../theme/palette';

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
 * @param {(id: string) => string} [props.getInfoContent] Returns the HTML string shown in a marker's popup.
 * @param {string} [props.selectedMarkerId] Pans to and opens the popup for this marker when it changes.
 * @param {string|number} [props.height=360]
 */
function MapView({ center, zoom = 14, markers, onMarkerClick, getInfoContent, selectedMarkerId, height = 360 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerObjectsRef = useRef(new Map());
  const [status, setStatus] = useState('loading');

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
      map = L.map(containerRef.current, {
        center: [center.lat, center.lng],
        zoom,
        zoomControl: true,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
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

  // Re-center when the caller's center prop changes (e.g. selecting a store).
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return;
    mapRef.current.panTo([center.lat, center.lng]);
  }, [status, center]);

  // Rebuild markers whenever the marker list (or its selected flags) changes.
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return undefined;
    const markerObjects = markerObjectsRef.current;

    markerObjects.forEach((marker) => marker.remove());
    markerObjects.clear();

    markers.forEach((markerData) => {
      const marker = L.circleMarker([markerData.position.lat, markerData.position.lng], {
        radius: markerData.selected ? 14 : 11,
        fillColor: markerData.color ?? colors.accentBlue,
        fillOpacity: 1,
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

  // Open the popup when selection changes from outside the map (e.g. the store list).
  useEffect(() => {
    if (status !== 'ready' || !selectedMarkerId || !getInfoContent) return;
    const marker = markerObjectsRef.current.get(selectedMarkerId);
    if (!marker) return;
    mapRef.current.panTo(marker.getLatLng());
    marker.bindPopup(getInfoContent(selectedMarkerId)).openPopup();
  }, [status, selectedMarkerId, getInfoContent]);

  return (
    <Box sx={{ position: 'relative', height, borderRadius: 2, overflow: 'hidden' }}>
      <Box ref={containerRef} sx={{ position: 'absolute', inset: 0, display: status === 'ready' ? 'block' : 'none' }} />

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

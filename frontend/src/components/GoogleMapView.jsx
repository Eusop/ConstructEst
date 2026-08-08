import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import LocationOffRoundedIcon from '@mui/icons-material/LocationOffRounded';
import { hasGoogleMapsApiKey, loadGoogleMapsLibrary } from '../services/googleMapsLoader';
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
 * Reusable Google Map: loads the Maps JavaScript API, renders markers from
 * plain data, and opens an InfoWindow with per-marker HTML content on
 * click. Domain-agnostic — callers (Store Locator, or any future map
 * feature) supply their own marker data and info content; this component
 * knows nothing about stores or projects.
 *
 * Requires VITE_GOOGLE_MAPS_API_KEY (see .env.example) — without it, this
 * renders a clear fallback instead of a broken/blank map.
 *
 * @param {object} props
 * @param {{lat: number, lng: number}} props.center
 * @param {number} [props.zoom=14]
 * @param {Array<{id: string, position: {lat: number, lng: number}, label?: string, color?: string, selected?: boolean}>} props.markers
 * @param {(id: string) => void} [props.onMarkerClick]
 * @param {(id: string) => string} [props.getInfoContent] Returns the HTML string shown in a marker's InfoWindow.
 * @param {string} [props.selectedMarkerId] Pans to and opens the InfoWindow for this marker when it changes.
 * @param {string|number} [props.height=360]
 */
function GoogleMapView({ center, zoom = 14, markers, onMarkerClick, getInfoContent, selectedMarkerId, height = 360 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const infoWindowRef = useRef(null);
  const markerObjectsRef = useRef(new Map());
  const [status, setStatus] = useState(hasGoogleMapsApiKey() ? 'loading' : 'missing-key');

  // Load the API and create the map instance once.
  useEffect(() => {
    if (!hasGoogleMapsApiKey() || !containerRef.current) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const { Map, InfoWindow } = await loadGoogleMapsLibrary('maps');
        await loadGoogleMapsLibrary('marker');
        if (cancelled || !containerRef.current) return;

        mapRef.current = new Map(containerRef.current, {
          center,
          zoom,
          disableDefaultUI: false,
          zoomControl: true,
          fullscreenControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          clickableIcons: false,
        });
        infoWindowRef.current = new InfoWindow();
        setStatus('ready');
      } catch (error) {
        console.error('Failed to load Google Maps:', error);
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally only on mount — center/zoom below just pan the existing map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-center when the caller's center prop changes (e.g. selecting a store).
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return;
    mapRef.current.panTo(center);
  }, [status, center]);

  // Rebuild markers whenever the marker list (or its selected flags) changes.
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return undefined;

    markerObjectsRef.current.forEach((marker) => marker.setMap(null));
    markerObjectsRef.current.clear();

    markers.forEach((markerData) => {
      const marker = new window.google.maps.Marker({
        map: mapRef.current,
        position: markerData.position,
        title: markerData.title,
        label: markerData.label
          ? { text: markerData.label, color: '#fff', fontSize: '12px', fontWeight: '700' }
          : undefined,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: markerData.color ?? colors.accentBlue,
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
          scale: markerData.selected ? 14 : 11,
        },
        zIndex: markerData.selected ? 2 : 1,
      });

      marker.addListener('click', () => {
        onMarkerClick?.(markerData.id);
        if (getInfoContent) {
          infoWindowRef.current.setContent(getInfoContent(markerData.id));
          infoWindowRef.current.open({ map: mapRef.current, anchor: marker });
        }
      });

      markerObjectsRef.current.set(markerData.id, marker);
    });

    return () => {
      markerObjectsRef.current.forEach((marker) => marker.setMap(null));
      markerObjectsRef.current.clear();
    };
  }, [status, markers, onMarkerClick, getInfoContent]);

  // Open the InfoWindow when selection changes from outside the map (e.g. the store list).
  useEffect(() => {
    if (status !== 'ready' || !selectedMarkerId || !getInfoContent) return;
    const marker = markerObjectsRef.current.get(selectedMarkerId);
    if (!marker) return;
    infoWindowRef.current.setContent(getInfoContent(selectedMarkerId));
    infoWindowRef.current.open({ map: mapRef.current, anchor: marker });
  }, [status, selectedMarkerId, getInfoContent]);

  return (
    <Box sx={{ position: 'relative', height, borderRadius: 2, overflow: 'hidden' }}>
      <Box ref={containerRef} sx={{ position: 'absolute', inset: 0, display: status === 'ready' ? 'block' : 'none' }} />

      {status === 'loading' && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: colors.heroBackground }}>
          <CircularProgress size={28} sx={{ color: colors.accentBlue }} />
        </Box>
      )}

      {status === 'missing-key' && (
        <FallbackState
          icon={<LocationOffRoundedIcon sx={{ fontSize: 32, color: 'text.disabled' }} />}
          title="Map unavailable"
          description="Add VITE_GOOGLE_MAPS_API_KEY to your .env file to enable the live map (see .env.example)."
        />
      )}

      {status === 'error' && (
        <FallbackState
          icon={<LocationOffRoundedIcon sx={{ fontSize: 32, color: 'text.disabled' }} />}
          title="Couldn't load the map"
          description="Check your Google Maps API key and internet connection, then reload the page."
        />
      )}
    </Box>
  );
}

export default GoogleMapView;

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import MapView from '../components/MapView';
import StoreListCard from '../features/storeLocator/components/StoreListCard';
import NoActiveProjectState from '../features/projects/components/NoActiveProjectState';
import {
  STORES, CITY_LOCATION, DISTANCE_IS_BY_ROAD, loadStores, applyRoadDistances,
} from '../features/storeLocator/data/storesCache';
import { buildStoreInfoWindowContent } from '../features/storeLocator/utils/buildStoreInfoWindowContent';
import { useProjects } from '../context/ProjectsContext';
import { useToast } from '../context/ToastContext';
import { parseCeiling, cheapestFullStore } from '../features/storeLocator/utils/budgetCheck';
import { formatPeso } from '../utils/formatNumbers';
import { useUserLocation } from '../hooks/useUserLocation';
import { apiRequest } from '../services/apiClient';
import { ROUTES } from '../routes/paths';
import { colors } from '../theme/palette';

function badgeColorFor(store) {
  if (!store.inStock) return 'grey.400';
  return store.isCheapest ? colors.iconGreenFg : colors.orange;
}

const MANUAL_LOCATION_KEY = 'constructest_manual_location';

// try/catch: storage can be blocked (private mode, cleared site data).
function readManualLocation() {
  try {
    const saved = JSON.parse(localStorage.getItem(MANUAL_LOCATION_KEY));
    return Number.isFinite(saved?.lat) && Number.isFinite(saved?.lng) ? { lat: saved.lat, lng: saved.lng } : null;
  } catch {
    return null;
  }
}

function writeManualLocation(location) {
  try {
    if (location) localStorage.setItem(MANUAL_LOCATION_KEY, JSON.stringify(location));
    else localStorage.removeItem(MANUAL_LOCATION_KEY);
  } catch {
    // Not saved; it still applies for this visit.
  }
}

// Fake marker id for the user's own position (not a store), so it is skipped
// by the selection and info-window logic.
const USER_LOCATION_MARKER_ID = 'user-location';

/**
 * Store Locator: compares each store's BOM cost and distance on a map and a
 * synced list. Selecting a store highlights it in both and centers the map.
 * Loads the per-store cost optimization once per active project.
 */
// Phones start with a short preview; tablet and desktop always show the full
// list, so this only affects the xs breakpoint.
const MOBILE_PREVIEW_COUNT = 3;

function StoreLocatorPage() {
  const { activeProject, updateActiveProject } = useProjects();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [hardwareListExpanded, setHardwareListExpanded] = useState(false);
  const [rawStores, setRawStores] = useState(null);
  const [loadedForId, setLoadedForId] = useState(null);
  const [loadError, setLoadError] = useState('');
  const { location: deviceLocation, status: geoStatus, rejectedDistanceKm, refetch: refetchLocation } = useUserLocation();
  // A spot the user tapped on the map. It wins over the browser's guess, which on
  // a laptop can be tens of km off. Kept in this browser only.
  const [manualLocation, setManualLocation] = useState(readManualLocation);
  const [pickingLocation, setPickingLocation] = useState(false);
  const userLocation = manualLocation ?? deviceLocation;
  // Stays true once geolocation has settled once, so the "locate me" button
  // doesn't blank the page behind the big spinner again.
  const [hasSettledLocationOnce, setHasSettledLocationOnce] = useState(false);
  useEffect(() => {
    if (geoStatus === 'loading' || hasSettledLocationOnce) return;
    queueMicrotask(() => setHasSettledLocationOnce(true));
  }, [geoStatus, hasSettledLocationOnce]);
  // Waits for the store fetch and the first geolocation attempt, so distances
  // never show from the wrong origin and then swap.
  const ready = loadedForId === activeProject?.id && (geoStatus !== 'loading' || hasSettledLocationOnce);

  useEffect(() => {
    if (!activeProject || typeof activeProject.id !== 'number') return undefined;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setRawStores(null);
    });

    apiRequest(`/projects/${activeProject.id}/stores`)
      .then(({ stores }) => {
        if (cancelled) return;
        setRawStores(stores);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.message || 'Could not load store comparison.');
        setRawStores([]);
      });

    return () => {
      cancelled = true;
    };
  }, [activeProject?.id]);

  // Bumped when STORES is refilled or gets road distances (it is mutated in
  // place), since displayedStores is memoized on this.
  const [storesVersion, setStoresVersion] = useState(0);
  // 'cheapest' = the server's order (FR-12's cost ranking), 'nearest' = by distance.
  const [sortMode, setSortMode] = useState('cheapest');

  useEffect(() => {
    if (rawStores === null || geoStatus === 'loading' || typeof activeProject?.id !== 'number') return undefined;
    let cancelled = false;
    const origin = userLocation ?? CITY_LOCATION;
    loadStores(rawStores, origin);
    queueMicrotask(() => {
      if (cancelled) return;
      setLoadedForId(activeProject.id);
      setStoresVersion((version) => version + 1);
    });
    // Straight-line shows first; road distance (OpenRouteService) replaces it
    // when it arrives. Any failure keeps straight-line.
    if (rawStores.length > 0) {
      apiRequest('/stores/road-distances', { method: 'POST', body: { origin: { lat: origin.lat, lng: origin.lng } } })
        .then((result) => {
          if (cancelled || !result?.available) return;
          applyRoadDistances(result.byStoreId);
          setStoresVersion((version) => version + 1);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [rawStores, userLocation, geoStatus, activeProject?.id]);

  // Copies with rank = position in the chosen order, so card and map numbers
  // match the list. The Cheapest badge stays on isCheapest.
  const displayedStores = useMemo(() => {
    const ordered = sortMode === 'nearest'
      ? [...STORES].sort((a, b) => (a.roadKm ?? a.distanceKm) - (b.roadKm ?? b.distanceKm))
      : STORES;
    return ordered.map((store, index) => ({ ...store, rank: index + 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortMode, storesVersion]);

  const selectedStoreId = activeProject?.selectedStoreId ?? null;
  // When true, centers the map on the user instead of the selected store. Set by
  // the locate button, cleared when a store is picked.
  const [focusOnUser, setFocusOnUser] = useState(false);
  // Shared by the list and the map marker. A store missing some materials can
  // still be selected: StoreListCard shows what it lacks, and the BOM page
  // discloses it again.
  const setSelectedStoreId = (id) => {
    if (id === USER_LOCATION_MARKER_ID) return;
    setFocusOnUser(false);
    // Pop-up when the picked store lacks some materials (FR-11).
    const picked = STORES.find((store) => store.id === id);
    if (picked && id !== selectedStoreId && picked.missingMaterials.length > 0) {
      const names = picked.missingMaterials.map((material) => material.name).join(', ');
      const elsewhere = [...new Set(picked.missingMaterials.flatMap((material) => material.availableAtStores ?? []))].sort();
      showToast(
        `${picked.name} does not carry: ${names}.${elsewhere.length ? ` Available at: ${elsewhere.join(', ')}.` : ''}`,
        'warning',
        8000,
      );
    }
    updateActiveProject({ selectedStoreId: id });
  };

  // The locate button means "use my device's location again".
  const handleLocateRequest = () => {
    setManualLocation(null);
    writeManualLocation(null);
    setPickingLocation(false);
    setFocusOnUser(true);
    refetchLocation();
  };

  const handleMapClick = (lat, lng) => {
    if (!pickingLocation) return;
    const picked = { lat, lng };
    setManualLocation(picked);
    writeManualLocation(picked);
    setPickingLocation(false);
    setFocusOnUser(true);
  };

  const setLocationLink = (label) => (
    <Link component="button" type="button" onClick={() => setPickingLocation(true)} sx={{ fontSize: 'inherit', verticalAlign: 'baseline' }}>
      {label}
    </Link>
  );
  // Always says where distances are measured from, so a rejected or blocked
  // device location is never silently swapped for the city center.
  let originNote;
  if (manualLocation) {
    originNote = <>Distances are from the spot you set on the map. {setLocationLink('Change it')}, or use the locate button for your device location.</>;
  } else if (geoStatus === 'granted') {
    originNote = <>Distances are from your device&apos;s location. Wrong? {setLocationLink('Set your location on the map')}.</>;
  } else if (geoStatus === 'implausible') {
    originNote = <>Your browser placed you about {rejectedDistanceKm} km from Tarlac City, which looks wrong, so distances are from Tarlac City center. {setLocationLink('Set your location on the map')}.</>;
  } else if (geoStatus === 'imprecise') {
    originNote = <>Your browser&apos;s location was too rough to use, so distances are from Tarlac City center. {setLocationLink('Set your location on the map')}.</>;
  } else if (geoStatus === 'denied') {
    originNote = <>Location access is blocked, so distances are from Tarlac City center. {setLocationLink('Set your location on the map')}.</>;
  } else {
    originNote = <>Your location isn&apos;t available, so distances are from Tarlac City center. {setLocationLink('Set your location on the map')}.</>;
  }

  const selectedStore = STORES.find((store) => store.id === selectedStoreId) ?? null;
  const ceiling = parseCeiling(activeProject?.budgetCeiling);
  const closestStore = cheapestFullStore(STORES);
  const focusedOnUser = focusOnUser && userLocation;
  const mapCenter = focusedOnUser ? userLocation : selectedStore?.position ?? userLocation ?? CITY_LOCATION;
  // Wider zoom by default, closer once something specific is selected.
  const mapZoom = selectedStore || focusedOnUser ? 16 : 14;

  const markers = useMemo(() => {
    const storeMarkers = displayedStores.map((store) => ({
      id: store.id,
      position: store.position,
      title: store.name,
      label: String(store.rank),
      color: badgeColorFor(store),
      selected: store.id === selectedStoreId,
    }));
    if (!userLocation) return storeMarkers;
    return [
      ...storeMarkers,
      { id: USER_LOCATION_MARKER_ID, position: userLocation, title: 'Your location', label: 'You', color: colors.accentBlue, selected: false },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreId, ready, userLocation, displayedStores]);

  const getInfoContent = useCallback((id) => {
    if (id === USER_LOCATION_MARKER_ID) return '<strong>Your location</strong>';
    const store = STORES.find((item) => item.id === id);
    return store ? buildStoreInfoWindowContent(store) : '';
  }, []);

  if (!activeProject) {
    return <NoActiveProjectState />;
  }

  if (!ready) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 240 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0, minWidth: 0 }}>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.4rem' }, color: 'text.primary' }}>Compare hardware stores</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
          Total BOM cost and distance for canvassed stores near {activeProject.location}.
        </Typography>
        {/* Same rule as getStoreOptimization in optimization.service.js. */}
        <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 0.25 }}>
          Total cost = the cheapest in-stock brand of each material x its quantity. When sorted by Cheapest, stores with every material in stock come first.
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 0.25 }}>
          {DISTANCE_IS_BY_ROAD
            ? 'Distances and drive times are by road (OpenRouteService). Tap Directions for the route.'
            : 'Distances are straight-line. Tap Directions for the actual road route.'}
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 0.25 }}>
          {pickingLocation ? (
            <>
              <strong>Tap the map where you are.</strong>{' '}
              <Link component="button" type="button" onClick={() => setPickingLocation(false)} sx={{ fontSize: 'inherit', verticalAlign: 'baseline' }}>
                Cancel
              </Link>
            </>
          ) : originNote}
        </Typography>
        {ceiling != null && (
          <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 0.25 }}>
            Your budget ceiling: <strong>{formatPeso(ceiling)}</strong>.
          </Typography>
        )}
        {loadError && (
          <Typography sx={{ color: colors.iconRedFg, fontSize: '0.85rem', mt: 0.5 }}>{loadError}</Typography>
        )}
        {/* FR-7: no store fits the ceiling, so name the closest one. */}
        {ceiling != null && closestStore && closestStore.totalCost > ceiling && (
          <Alert severity="warning" sx={{ mt: 1, fontSize: '0.82rem' }}>
            No store fits your {formatPeso(ceiling)} budget ceiling. The closest is {closestStore.name} at{' '}
            {formatPeso(closestStore.totalCost)} ({formatPeso(closestStore.totalCost - ceiling)} over), using the cheapest brands.
          </Alert>
        )}
      </Box>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2.5}
        // Keeps the map and list from being squeezed under the Continue button.
        // 540 = two 260 panels + spacing (stacked), 420 = panel height (side by side).
        sx={{ flexGrow: { xs: 1, sm: 0, md: 1 }, minHeight: { xs: 'auto', sm: 540, md: 420 }, minWidth: 0 }}
      >
        {/* Doesn't shrink when stacked, so the map never covers the list. */}
        <Box sx={{ flex: { md: 3 }, flexShrink: { xs: 0, md: 1 }, width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              bgcolor: 'common.white',
              boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
              p: 1.5,
              flex: 1,
              minHeight: { xs: 260, md: 420 },
            }}
          >
            <MapView
              center={mapCenter}
              zoom={mapZoom}
              markers={markers}
              onMarkerClick={setSelectedStoreId}
              onMapClick={handleMapClick}
              getInfoContent={getInfoContent}
              selectedMarkerId={selectedStoreId}
              onLocateRequest={handleLocateRequest}
              isLocating={geoStatus === 'loading'}
              height="100%"
            />
          </Paper>
        </Box>

        <Box sx={{ flex: { xs: 1, sm: 'unset', md: 2 }, width: '100%', display: 'flex', flexDirection: 'column', minHeight: { xs: 220, sm: 0 } }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              bgcolor: 'common.white',
              boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
              p: 1.5,
              flex: 1,
              // A bounded height plus scroll, so the list doesn't grow past its row and
              // push the button on top of it. Same as the map's Paper on the left.
              overflow: 'auto',
              // Phones: no fixed height. It fills what the flex chain leaves, so the
              // page ends a consistent padding above the bottom, and a long list scrolls here.
              minHeight: { xs: 0, sm: 260, md: 420 },
              // 'contain' on xs backfired: when the list has nothing to scroll (e.g. the
              // 3-card mobile preview), the browser still swallowed the touch gesture
              // instead of scrolling the page. 'auto' (same as sm+) lets it fall back.
              overscrollBehavior: 'auto',
              WebkitOverflowScrolling: { xs: 'touch', sm: 'auto' },
            }}
          >
            <Stack spacing={{ xs: 1.25, sm: 1.5 }}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.secondary' }}>Sort by</Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={sortMode}
                  onChange={(_, value) => value && setSortMode(value)}
                  aria-label="Sort stores"
                >
                  <ToggleButton value="cheapest" sx={{ textTransform: 'none', px: 1.5, py: 0.4 }}>Cheapest</ToggleButton>
                  <ToggleButton value="nearest" sx={{ textTransform: 'none', px: 1.5, py: 0.4 }}>Nearest</ToggleButton>
                </ToggleButtonGroup>
              </Stack>

              {(isMobile ? displayedStores.slice(0, MOBILE_PREVIEW_COUNT) : displayedStores).map((store) => (
                <StoreListCard
                  key={store.id}
                  store={store}
                  badgeColor={badgeColorFor(store)}
                  selected={store.id === selectedStoreId}
                  onSelect={() => setSelectedStoreId(store.id)}
                  ceiling={ceiling}
                />
              ))}

              {isMobile && displayedStores.length > MOBILE_PREVIEW_COUNT && (
                <>
                  <Collapse in={hardwareListExpanded} timeout="auto" unmountOnExit>
                    <Stack spacing={1.25}>
                      {displayedStores.slice(MOBILE_PREVIEW_COUNT).map((store) => (
                        <StoreListCard
                          key={store.id}
                          store={store}
                          badgeColor={badgeColorFor(store)}
                          selected={store.id === selectedStoreId}
                          onSelect={() => setSelectedStoreId(store.id)}
                          ceiling={ceiling}
                        />
                      ))}
                    </Stack>
                  </Collapse>

                  <Button
                    onClick={() => setHardwareListExpanded((prev) => !prev)}
                    disableElevation
                    fullWidth
                    aria-expanded={hardwareListExpanded}
                    endIcon={
                      <ExpandMoreRoundedIcon
                        sx={{
                          fontSize: 20,
                          transition: 'transform 0.2s ease',
                          transform: hardwareListExpanded ? 'rotate(180deg)' : 'none',
                        }}
                      />
                    }
                    sx={{
                      minHeight: 44,
                      borderRadius: 2.5,
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      textTransform: 'none',
                      color: colors.accentBlue,
                      bgcolor: colors.iconBlueBg,
                      '&:hover': { bgcolor: colors.iconBlueBg, opacity: 0.85 },
                    }}
                  >
                    {hardwareListExpanded ? 'Show Less' : `View All Hardware (${STORES.length})`}
                  </Button>
                </>
              )}
            </Stack>
          </Paper>
        </Box>
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end' }, pb: { xs: 2, sm: 3 } }}>
        <Tooltip title={selectedStoreId ? '' : 'Select a hardware store to continue'}>
          {/* Box, not a bare <span>, so it can carry the full-width phone style and
              still forward the ref Tooltip needs on a disabled button. */}
          <Box component="span" sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Button
              onClick={() => navigate(ROUTES.BRAND_SELECTION)}
              variant="contained"
              disableElevation
              disabled={!selectedStoreId}
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{
                bgcolor: colors.accentBlue,
                '&:hover': { bgcolor: colors.accentBlueDark },
                fontSize: { xs: '0.9rem', sm: '1.05rem' },
                // Full-bleed primary action on phones, like the app's other mobile CTAs.
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              Continue to Brand Selection
            </Button>
          </Box>
        </Tooltip>
      </Box>
    </Stack>
  );
}

export default StoreLocatorPage;

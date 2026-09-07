import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import MapView from '../components/MapView';
import StoreListCard from '../features/storeLocator/components/StoreListCard';
import NoActiveProjectState from '../features/projects/components/NoActiveProjectState';
import { STORES, CITY_LOCATION, DISTANCE_IS_FROM_USER, loadStores } from '../features/storeLocator/data/storesMock';
import { buildStoreInfoWindowContent } from '../features/storeLocator/utils/buildStoreInfoWindowContent';
import { useProjects } from '../context/ProjectsContext';
import { useNotifications } from '../context/NotificationsContext';
import { useUserLocation } from '../hooks/useUserLocation';
import { apiRequest } from '../services/apiClient';
import { ROUTES } from '../routes/paths';
import { colors } from '../theme/palette';

function badgeColorFor(store) {
  if (!store.inStock) return 'grey.400';
  return store.isCheapest ? colors.iconGreenFg : colors.orange;
}

// Fake marker id for the user's own position, not a real store, so it's
// excluded from the selection/info-window logic below instead of being
// looked up in STORES.
const USER_LOCATION_MARKER_ID = 'user-location';

/**
 * Store Locator: compares each store's BOM cost and distance on a map
 * plus a synced list. Selecting a store (either way) highlights it in
 * both and centers the map. Fetches the real per-store cost optimization
 * once per active project.
 */
function StoreLocatorPage() {
  const { activeProject, updateActiveProject } = useProjects();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [rawStores, setRawStores] = useState(null);
  const [loadedForId, setLoadedForId] = useState(null);
  const [loadError, setLoadError] = useState('');
  const { location: userLocation, status: geoStatus, refetch: refetchLocation } = useUserLocation();
  // Stays true once geolocation settles once, so a later "locate me"
  // click doesn't re-blank the whole page behind the big spinner (just
  // the button itself shows a small spinner for that).
  const [hasSettledLocationOnce, setHasSettledLocationOnce] = useState(false);
  useEffect(() => {
    if (geoStatus === 'loading' || hasSettledLocationOnce) return;
    queueMicrotask(() => setHasSettledLocationOnce(true));
  }, [geoStatus, hasSettledLocationOnce]);
  // Waits on both the store fetch and the first geolocation attempt, so
  // it never shows a distance from the wrong origin and then swaps it.
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

  useEffect(() => {
    if (rawStores === null || geoStatus === 'loading' || typeof activeProject?.id !== 'number') return undefined;
    let cancelled = false;
    loadStores(rawStores, userLocation ?? CITY_LOCATION);
    queueMicrotask(() => {
      if (!cancelled) setLoadedForId(activeProject.id);
    });
    return () => {
      cancelled = true;
    };
  }, [rawStores, userLocation, geoStatus, activeProject?.id]);

  const selectedStoreId = activeProject?.selectedStoreId ?? null;
  // Centers the map on the user instead of the selected store when true,
  // set by the locate button, cleared once a store is picked again.
  const [focusOnUser, setFocusOnUser] = useState(false);
  // Centralized here since both the list and map marker call this. An
  // out-of-stock store can't be picked, explain why instead of just
  // silently doing nothing.
  const setSelectedStoreId = (id) => {
    if (id === USER_LOCATION_MARKER_ID) return;
    const target = STORES.find((store) => store.id === id);
    if (target && !target.inStock) {
      addNotification({
        type: 'store_selected',
        title: 'Store unavailable',
        description: `${target.name} is missing ${target.outOfStockMaterial ?? 'a required material'}. Choose a fully-stocked store to continue.`,
      });
      return;
    }
    setFocusOnUser(false);
    updateActiveProject({ selectedStoreId: id });
  };

  const handleLocateRequest = () => {
    setFocusOnUser(true);
    refetchLocation();
  };

  const selectedStore = STORES.find((store) => store.id === selectedStoreId) ?? null;
  const focusedOnUser = focusOnUser && userLocation;
  const mapCenter = focusedOnUser ? userLocation : selectedStore?.position ?? userLocation ?? CITY_LOCATION;
  // Wider zoom by default, closer once something specific is selected.
  const mapZoom = selectedStore || focusedOnUser ? 16 : 14;

  const markers = useMemo(() => {
    const storeMarkers = STORES.map((store) => ({
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
  }, [selectedStoreId, ready, userLocation]);

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
    <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0 }}>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.4rem' }, color: 'text.primary' }}>Compare hardware stores</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
          Total BOM cost and distance for canvassed stores near {activeProject.location}.
        </Typography>
        {!DISTANCE_IS_FROM_USER && (
          <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 0.25, fontStyle: 'italic' }}>
            Location access unavailable, distances approximated from Tarlac City center.
          </Typography>
        )}
        {loadError && (
          <Typography sx={{ color: colors.iconRedFg, fontSize: '0.85rem', mt: 0.5 }}>{loadError}</Typography>
        )}
      </Box>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2.5}
        sx={{ flexGrow: { xs: 0, md: 1 }, minHeight: 0, minWidth: 0 }}
      >
        <Box sx={{ flex: { md: 3 }, width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
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
              getInfoContent={getInfoContent}
              selectedMarkerId={selectedStoreId}
              onLocateRequest={handleLocateRequest}
              isLocating={geoStatus === 'loading'}
              height="100%"
            />
          </Paper>
        </Box>

        <Box sx={{ flex: { md: 2 }, width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              bgcolor: 'common.white',
              boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
              p: 1.5,
              flex: 1,
              minHeight: { xs: 260, md: 420 },
              // Without a bounded height + scroll, this list grew past its
              // row and the button below landed on top of it. Matches the
              // map's Paper on the left so both columns behave the same.
              overflow: 'auto',
            }}
          >
            <Stack spacing={1.5}>
              {STORES.map((store) => (
                <StoreListCard
                  key={store.id}
                  store={store}
                  badgeColor={badgeColorFor(store)}
                  selected={store.id === selectedStoreId}
                  onSelect={() => setSelectedStoreId(store.id)}
                />
              ))}
            </Stack>
          </Paper>
        </Box>
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end' } }}>
        <Tooltip title={selectedStoreId ? '' : 'Select a hardware store to continue'}>
          <span>
            <Button
              onClick={() => {
                if (selectedStore) {
                  addNotification({
                    type: 'store_selected',
                    title: 'Store selected',
                    description: `${selectedStore.name} selected for ${activeProject.projectName}.`,
                  });
                }
                navigate(ROUTES.BRAND_SELECTION);
              }}
              variant="contained"
              disableElevation
              disabled={!selectedStoreId}
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{
                bgcolor: colors.accentBlue,
                '&:hover': { bgcolor: colors.accentBlueDark },
                fontSize: { xs: '0.9rem', sm: '1.05rem' },
              }}
            >
              Continue to Brand Selection
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Stack>
  );
}

export default StoreLocatorPage;

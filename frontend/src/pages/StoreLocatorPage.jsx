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
import GoogleMapView from '../components/GoogleMapView';
import StoreListCard from '../features/storeLocator/components/StoreListCard';
import NoActiveProjectState from '../features/projects/components/NoActiveProjectState';
import { STORES, CITY_LOCATION, loadStores } from '../features/storeLocator/data/storesMock';
import { buildStoreInfoWindowContent } from '../features/storeLocator/utils/buildStoreInfoWindowContent';
import { useProjects } from '../context/ProjectsContext';
import { useNotifications } from '../context/NotificationsContext';
import { apiRequest } from '../services/apiClient';
import { ROUTES } from '../routes/paths';
import { colors } from '../theme/palette';

function badgeColorFor(store) {
  if (!store.inStock) return 'grey.400';
  return store.isCheapest ? colors.iconGreenFg : colors.orange;
}

/**
 * Store Locator: compares canvassed hardware stores' Bill of Materials
 * cost and distance on an interactive Google Map plus a synced list.
 * Selecting a store either way (marker click or list click) highlights it
 * in both places and centers the map on it. Fetches the real per-store
 * cost optimization (GET /api/projects/:id/stores — Table 20's logic) once
 * per active project and feeds it into storesMock, which STORES/CITY_LOCATION
 * below and StoreListCard both read.
 */
function StoreLocatorPage() {
  const { activeProject, updateActiveProject } = useProjects();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [loadedForId, setLoadedForId] = useState(null);
  const [loadError, setLoadError] = useState('');
  const ready = loadedForId === activeProject?.id;

  useEffect(() => {
    if (!activeProject || typeof activeProject.id !== 'number') return undefined;
    let cancelled = false;

    apiRequest(`/projects/${activeProject.id}/stores`)
      .then(({ stores }) => {
        if (cancelled) return;
        loadStores(stores);
        setLoadedForId(activeProject.id);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.message || 'Could not load store comparison.');
        setLoadedForId(activeProject.id);
      });

    return () => {
      cancelled = true;
    };
  }, [activeProject?.id]);

  const selectedStoreId = activeProject?.selectedStoreId ?? null;
  const setSelectedStoreId = (id) => updateActiveProject({ selectedStoreId: id });

  const selectedStore = STORES.find((store) => store.id === selectedStoreId) ?? null;

  const markers = useMemo(
    () =>
      STORES.map((store) => ({
        id: store.id,
        position: store.position,
        title: store.name,
        label: String(store.rank),
        color: badgeColorFor(store),
        selected: store.id === selectedStoreId,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedStoreId, ready],
  );

  const getInfoContent = useCallback((id) => {
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
        <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: 'text.primary' }}>Compare hardware stores</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          Total BOM cost and distance for canvassed stores near {activeProject.location}.
        </Typography>
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
              minHeight: 420,
            }}
          >
            <GoogleMapView
              center={selectedStore?.position ?? CITY_LOCATION}
              zoom={14}
              markers={markers}
              onMarkerClick={setSelectedStoreId}
              getInfoContent={getInfoContent}
              selectedMarkerId={selectedStoreId}
              height="100%"
            />
          </Paper>
        </Box>

        <Stack spacing={1.5} sx={{ flex: { md: 2 }, width: '100%' }}>
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
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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
              sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
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

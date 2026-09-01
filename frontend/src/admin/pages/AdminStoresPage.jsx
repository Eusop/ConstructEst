import { useEffect, useMemo, useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import MapView from '../../components/MapView';
import EmptyState from '../components/EmptyState';
import AddStoreDialog from '../components/AddStoreDialog';
import StoreDetailsDialog from '../components/StoreDetailsDialog';
import { useAdminStores } from '../context/AdminStoresContext';
import { useAdminActivity } from '../context/AdminActivityContext';
import { useAdminToast } from '../context/AdminToastContext';
import { colors } from '../../theme/palette';

// Same Tarlac City default center the User Module's Store Locator uses, so
// the map opens somewhere sensible before any store has been added.
const DEFAULT_CENTER = { lat: 15.4802, lng: 120.5979 };

/**
 * Hardware Stores: the required first step before Materials & Brands can be
 * managed (requirements 9/10). Add via the dialog (Name/Address/coordinates
 * — see AddStoreDialog for why coordinates are manual for now), see them
 * plotted on the map, then "Set active & manage" hands off into Materials &
 * Brands for that store.
 */
function AdminStoresPage() {
  const { stores, activeStoreId, addStore, removeStore, setActiveStoreId, ensureStoreCatalogLoaded } = useAdminStores();
  const { logActivity } = useAdminActivity();
  const { showToast } = useAdminToast();
  const [addOpen, setAddOpen] = useState(false);
  const [detailsStoreId, setDetailsStoreId] = useState(null);

  const detailsStore = stores.find((store) => store.id === detailsStoreId) ?? null;

  useEffect(() => {
    if (detailsStoreId != null) ensureStoreCatalogLoaded(detailsStoreId);
  }, [detailsStoreId, ensureStoreCatalogLoaded]);

  const markers = useMemo(
    () =>
      stores.map((store) => ({
        id: store.id,
        position: { lat: store.lat, lng: store.lng },
        title: store.name,
        color: store.id === activeStoreId ? colors.orange : colors.accentBlue,
        selected: store.id === activeStoreId,
      })),
    [stores, activeStoreId],
  );

  const mapCenter = detailsStore ? { lat: detailsStore.lat, lng: detailsStore.lng } : stores[0] ? { lat: stores[0].lat, lng: stores[0].lng } : DEFAULT_CENTER;

  const handleAddStore = async (form) => {
    try {
      const store = await addStore(form);
      logActivity({ message: `Hardware store added: ${store.name}`, icon: StorefrontRoundedIcon, iconBg: colors.iconOrangeBg, iconFg: colors.iconOrangeFg });
      showToast('Store added to system');
      setAddOpen(false);
    } catch {
      showToast('Could not add store. Try again.', 'warning');
    }
  };

  const handleRemove = (storeId) => {
    const store = stores.find((item) => item.id === storeId);
    removeStore(storeId);
    logActivity({ message: `Hardware store removed: ${store?.name ?? ''}`, icon: StorefrontRoundedIcon, iconBg: colors.iconRedBg, iconFg: colors.iconRedFg });
    showToast('Store removed', 'warning');
    setDetailsStoreId(null);
  };

  return (
    <Stack spacing={2.5} sx={{ width: '100%', flex: 1, minHeight: 0 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'flex-end' }, justifyContent: 'space-between', gap: 1.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.4rem' }, color: 'text.primary' }}>Hardware Stores</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
            Find stores using Google Maps, add them to the system, then manage their materials and brands.
          </Typography>
        </Box>
        <Button
          onClick={() => setAddOpen(true)}
          variant="contained"
          disableElevation
          startIcon={<AddRoundedIcon />}
          sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark }, flexShrink: 0 }}
        >
          Add Hardware Store
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ flex: 1, minHeight: 0 }}>
        <Box sx={{ flex: { lg: 3 }, width: '100%', minHeight: { xs: 240, lg: 360 } }}>
          <Paper elevation={0} sx={{ borderRadius: 3, bgcolor: 'common.white', boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)', p: 1.5, height: '100%' }}>
            <MapView center={mapCenter} zoom={13} markers={markers} onMarkerClick={setDetailsStoreId} height="100%" />
          </Paper>
        </Box>

        <Box sx={{ flex: { lg: 2 }, width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {stores.length === 0 ? (
            <EmptyState
              icon={StorefrontRoundedIcon}
              iconBg={colors.iconOrangeBg}
              iconFg={colors.iconOrangeFg}
              title="No hardware stores yet."
              description="Add a hardware store to begin managing its available materials and brands."
            />
          ) : (
            <Paper elevation={0} sx={{ borderRadius: 3, bgcolor: 'common.white', boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)', p: 2, flex: 1, minHeight: 0, overflow: 'auto' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 1.5 }}>Registered stores · {stores.length}</Typography>
              <Stack spacing={1.25}>
                {stores.map((store) => (
                  <Paper
                    key={store.id}
                    elevation={0}
                    onClick={() => setDetailsStoreId(store.id)}
                    role="button"
                    tabIndex={0}
                    sx={{
                      p: 1.75,
                      borderRadius: 2.5,
                      border: '1.5px solid',
                      borderColor: store.id === activeStoreId ? colors.orange : 'divider',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease',
                      '&:hover': { borderColor: colors.orange },
                    }}
                  >
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: store.id === activeStoreId ? colors.iconOrangeBg : 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <StorefrontRoundedIcon sx={{ color: store.id === activeStoreId ? colors.orange : 'text.secondary', fontSize: 20 }} />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Typography noWrap sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{store.name}</Typography>
                          {store.id === activeStoreId && (
                            <Chip label="Active" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: colors.iconOrangeBg, color: colors.orange }} />
                          )}
                        </Stack>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          <LocationOnRoundedIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                          <Typography noWrap sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{store.address}</Typography>
                        </Stack>
                        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>
                          {store.stockedMaterialKeyCount} material{store.stockedMaterialKeyCount === 1 ? '' : 's'} stocked
                        </Typography>
                      </Box>
                      <ArrowForwardRoundedIcon sx={{ fontSize: 18, color: 'text.disabled', flexShrink: 0 }} />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          )}
        </Box>
      </Stack>

      <AddStoreDialog open={addOpen} defaultCenter={DEFAULT_CENTER} onClose={() => setAddOpen(false)} onSubmit={handleAddStore} />
      <StoreDetailsDialog
        open={Boolean(detailsStore)}
        store={detailsStore}
        onClose={() => setDetailsStoreId(null)}
        onSetActive={setActiveStoreId}
        onRemove={handleRemove}
      />
    </Stack>
  );
}

export default AdminStoresPage;

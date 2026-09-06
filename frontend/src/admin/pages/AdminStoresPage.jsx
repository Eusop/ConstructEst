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
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import MapView from '../../components/MapView';
import EmptyState from '../components/EmptyState';
import StoreFormDialog from '../components/StoreFormDialog';
import StoreDetailsDialog from '../components/StoreDetailsDialog';
import TypedConfirmDialog from '../../components/TypedConfirmDialog';
import { useAdminStores } from '../context/AdminStoresContext';
import { useAdminActivity } from '../context/AdminActivityContext';
import { useAdminToast } from '../context/AdminToastContext';
import { colors } from '../../theme/palette';

// Same Tarlac City default center the User Module's Store Locator uses, so
// the map opens somewhere sensible before any store has been added.
const DEFAULT_CENTER = { lat: 15.4802, lng: 120.5979 };

function ProfileReviewRow({ label, value }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>{label}</Typography>
      <Typography sx={{ color: 'text.primary', fontSize: '0.82rem', fontWeight: 600, textAlign: 'right' }} noWrap>
        {value}
      </Typography>
    </Stack>
  );
}

// Shown inside the Deactivate/Reactivate TypedConfirmDialog below — mirrors
// AdminUsersPage's UserProfileReview so an admin reviews exactly which store
// they're acting on before the typed word unlocks the button.
function StoreProfileReview({ store, intro }) {
  if (!store) return null;
  return (
    <Stack spacing={1.5}>
      <Typography sx={{ color: 'text.primary' }}>{intro}</Typography>
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: 'divider' }}>
        <Stack spacing={0.75}>
          <ProfileReviewRow label="Name" value={store.name} />
          <ProfileReviewRow label="Address" value={store.address} />
          <ProfileReviewRow label="Coordinates" value={`${store.lat?.toFixed?.(4)}, ${store.lng?.toFixed?.(4)}`} />
          <ProfileReviewRow label="Materials stocked" value={store.stockedMaterialKeyCount ?? 0} />
        </Stack>
      </Paper>
    </Stack>
  );
}

/**
 * Hardware Stores: the required first step before Materials & Brands can be
 * managed (requirements 9/10). Add or edit via StoreFormDialog
 * (Name/Address/click-to-drop-pin coordinates), see them plotted on the
 * map, then "Set active & manage" hands off into Materials & Brands for
 * that store.
 */
function AdminStoresPage() {
  const { stores, activeStoreId, addStore, updateStore, setStoreActive, removeStore, setActiveStoreId, ensureStoreCatalogLoaded } = useAdminStores();
  const { logActivity } = useAdminActivity();
  const { showToast } = useAdminToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [detailsStoreId, setDetailsStoreId] = useState(null);
  const [pendingRemoveId, setPendingRemoveId] = useState(null);
  // Both directions of the active/inactive toggle are gated behind a typed
  // word (DEACTIVATE / REACTIVATE) — mirrors AdminUsersPage's identical flow.
  const [pendingToggleActiveStore, setPendingToggleActiveStore] = useState(null);

  const detailsStore = stores.find((store) => store.id === detailsStoreId) ?? null;
  const pendingRemoveStore = stores.find((store) => store.id === pendingRemoveId) ?? null;

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

  const handleAdd = () => {
    setEditingStore(null);
    setFormOpen(true);
  };

  const handleEditRequest = (store) => {
    setDetailsStoreId(null);
    setEditingStore(store);
    setFormOpen(true);
  };

  const handleSaveStore = async (form) => {
    try {
      if (editingStore) {
        await updateStore(editingStore.id, form);
        logActivity({ message: `Hardware store updated: ${form.name}`, icon: StorefrontRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg });
        showToast('Store updated');
      } else {
        const store = await addStore(form);
        logActivity({ message: `Hardware store added: ${store.name}`, icon: StorefrontRoundedIcon, iconBg: colors.iconOrangeBg, iconFg: colors.iconOrangeFg });
        showToast('Store added to system');
      }
      setFormOpen(false);
    } catch (error) {
      showToast(error.message || `Could not ${editingStore ? 'update' : 'add'} store. Try again.`, 'warning');
    }
  };

  const handleRemoveRequest = (storeId) => {
    setDetailsStoreId(null);
    setPendingRemoveId(storeId);
  };

  const handleToggleActiveRequest = (store) => {
    setDetailsStoreId(null);
    setPendingToggleActiveStore(store);
  };

  const handleConfirmToggleActive = async () => {
    const store = pendingToggleActiveStore;
    const nextActive = !store.isActive;
    try {
      await setStoreActive(store.id, nextActive);
      logActivity({
        message: `Hardware store ${nextActive ? 'reactivated' : 'deactivated'}: ${store.name}`,
        icon: nextActive ? CheckCircleOutlineRoundedIcon : BlockRoundedIcon,
        iconBg: nextActive ? colors.iconGreenBg : colors.iconOrangeBg,
        iconFg: nextActive ? colors.iconGreenFg : colors.iconOrangeFg,
      });
      showToast(nextActive ? 'Store reactivated' : 'Store deactivated', nextActive ? 'success' : 'warning');
      setPendingToggleActiveStore(null);
    } catch (error) {
      showToast(error.message || `Could not ${nextActive ? 'reactivate' : 'deactivate'} this store. Try again.`, 'warning');
      throw error;
    }
  };

  const handleConfirmRemove = async () => {
    const store = pendingRemoveStore;
    try {
      await removeStore(pendingRemoveId);
      logActivity({ message: `Hardware store removed: ${store?.name ?? ''}`, icon: StorefrontRoundedIcon, iconBg: colors.iconRedBg, iconFg: colors.iconRedFg });
      showToast('Store removed', 'warning');
      setPendingRemoveId(null);
    } catch (error) {
      showToast(error.message || 'Could not remove store. Try again.', 'warning');
      throw error;
    }
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
          onClick={handleAdd}
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
                          {store.isActive === false && (
                            <Chip label="Deactivated" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'grey.100', color: 'text.secondary' }} />
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

      <StoreFormDialog
        key={editingStore?.id ?? 'add'}
        open={formOpen}
        store={editingStore}
        defaultCenter={DEFAULT_CENTER}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSaveStore}
      />
      <StoreDetailsDialog
        open={Boolean(detailsStore)}
        store={detailsStore}
        onClose={() => setDetailsStoreId(null)}
        onSetActive={setActiveStoreId}
        onEditRequest={handleEditRequest}
        onRemoveRequest={handleRemoveRequest}
        onToggleActiveRequest={handleToggleActiveRequest}
      />
      <TypedConfirmDialog
        key={pendingRemoveId ?? 'closed'}
        open={Boolean(pendingRemoveId)}
        title="Remove store"
        message={
          <>
            This permanently removes <strong>&ldquo;{pendingRemoveStore?.name ?? ''}&rdquo;</strong> and all of its
            configured materials and prices. This can&apos;t be undone.
          </>
        }
        confirmLabel="Yes, Remove"
        onCancel={() => setPendingRemoveId(null)}
        onConfirm={handleConfirmRemove}
      />
      <TypedConfirmDialog
        key={pendingToggleActiveStore?.id ?? 'closed'}
        open={Boolean(pendingToggleActiveStore)}
        title={pendingToggleActiveStore?.isActive === false ? 'Reactivate store' : 'Deactivate store'}
        confirmWord={pendingToggleActiveStore?.isActive === false ? 'REACTIVATE' : 'DEACTIVATE'}
        message={
          <StoreProfileReview
            store={pendingToggleActiveStore}
            intro={
              pendingToggleActiveStore?.isActive === false
                ? 'Review this store before reactivating it. It becomes selectable in Store Locator again.'
                : 'Review this store before deactivating it. It drops out of Store Locator comparisons until reactivated — its materials and prices stay intact.'
            }
          />
        }
        confirmLabel={pendingToggleActiveStore?.isActive === false ? 'Yes, Reactivate' : 'Yes, Deactivate'}
        onCancel={() => setPendingToggleActiveStore(null)}
        onConfirm={handleConfirmToggleActive}
      />
    </Stack>
  );
}

export default AdminStoresPage;

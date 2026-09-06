import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import EmptyState from '../components/EmptyState';
import AddMaterialsDialog from '../components/AddMaterialsDialog';
import BrandFormDialog from '../components/BrandFormDialog';
import BulkMaterialDialog from '../components/BulkMaterialDialog';
import { useAdminStores } from '../context/AdminStoresContext';
import { useAdminActivity } from '../context/AdminActivityContext';
import { useAdminToast } from '../context/AdminToastContext';
import { getMaterialDefinition } from '../data/materialCatalog';
import { useIsMobile } from '../../hooks/useIsMobile';
import { ADMIN_ROUTES } from '../../routes/paths';
import { colors } from '../../theme/palette';

function formatPeso(value) {
  if (value == null) return '—';
  return `₱${Number(value).toLocaleString('en-PH')}`;
}

function Stars({ count, sx }) {
  return (
    <Stack direction="row" sx={{ color: '#f5a623', ...sx }}>
      {[1, 2, 3, 4, 5].map((n) => (n <= count ? <StarRoundedIcon key={n} sx={{ fontSize: 16 }} /> : <StarBorderRoundedIcon key={n} sx={{ fontSize: 16 }} />))}
    </Stack>
  );
}

function AvailabilityChip({ available, sx }) {
  return (
    <Chip
      label={available ? 'Available' : 'Out of stock'}
      size="small"
      sx={{
        fontWeight: 700,
        height: 22,
        bgcolor: available ? colors.iconGreenBg : colors.iconRedBg,
        color: available ? colors.iconGreenFg : colors.iconRedFg,
        ...sx,
      }}
    />
  );
}

// ---------------------------------------------------------------------
// Mobile-only rendering (below `md`). Desktop's rows above are untouched —
// these are dedicated compact cards, not the desktop row squeezed smaller:
// no per-row category icon (it's the same generic icon on every row, pure
// clutter at phone width), a single "★ 4/5" instead of a 5-icon star
// rating, and edit/delete consolidated into one kebab menu instead of two
// separate icon buttons.
// ---------------------------------------------------------------------

function BulkMaterialMobileCard({ material, data, onOpenMenu }) {
  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 1.5 }}>
      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>{material.name}</Typography>
            <Chip label="Bulk" size="small" sx={{ height: 17, fontSize: '0.6rem', fontWeight: 700, bgcolor: colors.iconOrangeBg, color: colors.orange }} />
          </Stack>
          <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', mt: 0.25 }}>No brand selection · unit: {material.unit}</Typography>
        </Box>
        <IconButton size="small" onClick={(event) => onOpenMenu(event, { kind: 'bulk', materialKey: material.key })} sx={{ flexShrink: 0, mt: -0.5, mr: -0.5 }}>
          <MoreVertRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1.25 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', color: colors.iconGreenFg, bgcolor: colors.iconGreenBg, px: 1.1, py: 0.3, borderRadius: 1.5 }}>
          {formatPeso(data.price)}
          <Typography component="span" sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 600 }}> /{material.unit}</Typography>
        </Typography>
        <AvailabilityChip available={data.available ?? true} />
      </Stack>
    </Paper>
  );
}

function BrandMobileCard({ brand, onOpenMenu }) {
  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 1.25 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{brand.name}</Typography>
          <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center', mt: 0.25 }}>
            <StarRoundedIcon sx={{ fontSize: 14, color: '#f5a623' }} />
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 }}>{brand.stars}/5</Typography>
          </Stack>
        </Box>
        <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center', flexShrink: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: colors.iconGreenFg, bgcolor: colors.iconGreenBg, px: 1, py: 0.25, borderRadius: 1.5, whiteSpace: 'nowrap' }}>
            {formatPeso(brand.price)}
          </Typography>
          <IconButton size="small" onClick={(event) => onOpenMenu(event, { kind: 'brand', brand })}>
            <MoreVertRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
      <Box sx={{ mt: 0.75 }}>
        <AvailabilityChip available={brand.available} />
      </Box>
    </Paper>
  );
}

function MaterialMobileCard({ material, data, isOpen, onToggle, onRemove, onOpenMenu, onAddBrand }) {
  const brands = data.brands ?? [];
  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
      <Stack
        direction="row"
        spacing={0.5}
        onClick={onToggle}
        sx={{ alignItems: 'center', p: 1.5, bgcolor: 'grey.50', cursor: 'pointer', '&:active': { bgcolor: 'grey.100' } }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>{material.name}</Typography>
          <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary' }}>
            {brands.length} brand{brands.length === 1 ? '' : 's'} · unit: {material.unit}
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <DeleteOutlineRoundedIcon fontSize="small" color="error" />
        </IconButton>
        <ExpandMoreRoundedIcon
          sx={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', color: 'text.secondary' }}
        />
      </Stack>

      <Collapse in={isOpen}>
        <Box sx={{ p: brands.length ? 1.25 : 0 }}>
          {brands.length === 0 ? (
            <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem', textAlign: 'center', py: 2.5 }}>
              No brands added for {material.name} yet.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {brands.map((brand) => (
                <BrandMobileCard key={brand.id} brand={brand} onOpenMenu={(event, payload) => onOpenMenu(event, { ...payload, materialKey: material.key })} />
              ))}
            </Stack>
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', p: 1.5, pt: 0 }}>
          <Button
            size="small"
            onClick={onAddBrand}
            startIcon={<AddRoundedIcon />}
            sx={{ bgcolor: 'common.white', border: '1px solid', borderColor: 'grey.300', color: 'text.primary', fontSize: '0.8rem', '&:hover': { bgcolor: 'grey.50' } }}
          >
            Add Brand
          </Button>
        </Box>
      </Collapse>
    </Paper>
  );
}

/**
 * Materials & Brands: the store-specific catalog (Store -> Material ->
 * Brand -> Price -> Availability, requirement 11). Locked behind an active
 * store (requirement 10) and, once unlocked, behind the store actually
 * having materials added (requirement 12) — Sand/Gravel skip the brand
 * layer entirely (requirement 13).
 */
function AdminMaterialsPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { stores, activeStore, addMaterialsToStore, removeMaterialFromStore, updateBulkMaterial, addBrand, updateBrand, removeBrand } = useAdminStores();
  const { logActivity } = useAdminActivity();
  const { showToast } = useAdminToast();

  const [expanded, setExpanded] = useState({});
  const [addMaterialsOpen, setAddMaterialsOpen] = useState(false);
  const [brandDialog, setBrandDialog] = useState({ open: false, materialKey: null, brand: null });
  const [bulkDialog, setBulkDialog] = useState({ open: false, materialKey: null });
  // Mobile-only row action menu (kebab) — one shared Menu for every bulk-
  // material and brand row instead of a dialog/menu per row.
  const [rowMenu, setRowMenu] = useState(null);

  if (!activeStore) {
    return (
      <EmptyState
        icon={StorefrontRoundedIcon}
        iconBg={colors.iconOrangeBg}
        iconFg={colors.iconOrangeFg}
        title="Select a hardware store first."
        description={
          stores.length === 0
            ? 'Add a hardware store before managing its available materials and brands.'
            : 'Choose a store from Hardware Stores to manage its materials and brands.'
        }
        action={
          <Button
            onClick={() => navigate(ADMIN_ROUTES.STORES)}
            variant="contained"
            disableElevation
            sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
          >
            Go to Hardware Stores
          </Button>
        }
      />
    );
  }

  if (activeStore.materialKeys === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 240 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const toggleExpand = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleAddMaterials = async (keys) => {
    setAddMaterialsOpen(false);
    try {
      await addMaterialsToStore(activeStore.id, keys);
      const names = keys.map((key) => getMaterialDefinition(key)?.name).join(', ');
      logActivity({ message: `Materials added to ${activeStore.name}: ${names}`, icon: CategoryRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg });
      showToast('Materials added to store');
    } catch {
      showToast('Could not add materials. Try again.', 'warning');
    }
  };

  const handleRemoveMaterial = async (key) => {
    try {
      await removeMaterialFromStore(activeStore.id, key);
      logActivity({ message: `Material removed from ${activeStore.name}: ${getMaterialDefinition(key)?.name}`, icon: DeleteOutlineRoundedIcon, iconBg: colors.iconRedBg, iconFg: colors.iconRedFg });
      showToast('Material removed from store', 'warning');
    } catch {
      showToast('Could not remove material. Try again.', 'warning');
    }
  };

  const handleSaveBrand = async (form, quotationFile) => {
    const { materialKey, brand } = brandDialog;
    setBrandDialog({ open: false, materialKey: null, brand: null });
    try {
      if (brand) {
        await updateBrand(activeStore.id, materialKey, brand.id, form, quotationFile);
      } else {
        await addBrand(activeStore.id, materialKey, form, quotationFile);
        logActivity({ message: `Brand added: ${form.name} (${getMaterialDefinition(materialKey)?.name}) · ${formatPeso(form.price)}`, icon: AddRoundedIcon, iconBg: colors.iconGreenBg, iconFg: colors.iconGreenFg });
      }
      showToast('Brand saved');
    } catch (error) {
      showToast(error.message || 'Could not save brand. Try again.', 'warning');
    }
  };

  const handleDeleteBrand = async (materialKey, brandId) => {
    try {
      await removeBrand(activeStore.id, materialKey, brandId);
      showToast('Brand deleted', 'warning');
    } catch {
      showToast('Could not delete brand. Try again.', 'warning');
    }
  };

  const handleSaveBulk = async (form, quotationFile) => {
    setBulkDialog({ open: false, materialKey: null });
    try {
      await updateBulkMaterial(activeStore.id, bulkDialog.materialKey, form, quotationFile);
      logActivity({ message: `${getMaterialDefinition(bulkDialog.materialKey)?.name} updated at ${activeStore.name}: ${formatPeso(form.price)}`, icon: EditRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg });
      showToast('Material updated');
    } catch (error) {
      showToast(error.message || 'Could not update material. Try again.', 'warning');
    }
  };

  const openRowMenu = (event, payload) => setRowMenu({ anchorEl: event.currentTarget, ...payload });
  const closeRowMenu = () => setRowMenu(null);

  const stockedMaterials = activeStore.materialKeys.map((key) => getMaterialDefinition(key)).filter(Boolean);
  const brandCount = stockedMaterials.filter((m) => !m.bulk).length;
  const bulkCount = stockedMaterials.filter((m) => m.bulk).length;

  return (
    <Stack spacing={2.5} sx={{ width: '100%', flex: 1, minHeight: 0 }}>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.4rem' }, color: 'text.primary' }}>Materials & Brands</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>Manage the materials, brands, prices, and availability for the active store.</Typography>
      </Box>

      {/* Mobile: the dark navy card below is the one "themed" card on a page
          that's otherwise all light/white cards (the materials list, the
          empty state, every dialog) — stacked full-width "Change store" and
          "Add Material" buttons underneath it also made it read as a header
          plus two extra rows. Redesigned to match this app's ordinary white
          card language (colored icon tile on a light card, used everywhere
          else here): store info + a small "change store" icon action in one
          row, one primary "Add Material" button below it. Functionality is
          identical — same two click handlers, same navigation target. sm+
          renders the completely untouched original dark card right after
          this one. */}
      <Paper
        elevation={0}
        sx={{
          display: { xs: 'flex', sm: 'none' },
          flexDirection: 'column',
          gap: 1.5,
          bgcolor: 'common.white',
          boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
          borderRadius: 3,
          p: 1.75,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: colors.iconOrangeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <StorefrontRoundedIcon sx={{ fontSize: 20, color: colors.iconOrangeFg }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: '0.65rem', letterSpacing: 0.6, textTransform: 'uppercase', color: 'text.secondary', fontWeight: 700 }}>
              Active store
            </Typography>
            <Typography noWrap sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'text.primary' }}>{activeStore.name}</Typography>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <LocationOnRoundedIcon sx={{ fontSize: 13, color: 'text.secondary', flexShrink: 0 }} />
              <Typography noWrap sx={{ fontSize: '0.74rem', color: 'text.secondary' }}>{activeStore.address}</Typography>
            </Stack>
          </Box>
          <Tooltip title="Change store">
            <IconButton onClick={() => navigate(ADMIN_ROUTES.STORES)} size="small" sx={{ flexShrink: 0, bgcolor: 'grey.100', '&:hover': { bgcolor: 'grey.200' } }}>
              <SwapHorizRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        <Button
          onClick={() => setAddMaterialsOpen(true)}
          variant="contained"
          disableElevation
          fullWidth
          startIcon={<AddRoundedIcon />}
          sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
        >
          Add Material
        </Button>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          display: { xs: 'none', sm: 'flex' },
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          bgcolor: '#1f2433',
          color: '#fff',
          borderRadius: 3,
          p: { xs: 1.75, sm: 2.5 },
        }}
      >
        <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
          <Box sx={{ width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 }, borderRadius: 2, bgcolor: colors.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <StorefrontRoundedIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' }, letterSpacing: 1, textTransform: 'uppercase', color: 'grey.400', fontWeight: 700 }}>Active store</Typography>
            <Typography noWrap sx={{ fontWeight: 800, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>{activeStore.name}</Typography>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <LocationOnRoundedIcon sx={{ fontSize: 13, color: 'grey.400', flexShrink: 0 }} />
              <Typography noWrap sx={{ fontSize: { xs: '0.74rem', sm: '0.8rem' }, color: 'grey.400' }}>{activeStore.address}</Typography>
            </Stack>
          </Box>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button onClick={() => navigate(ADMIN_ROUTES.STORES)} sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
            Change store
          </Button>
          <Button
            onClick={() => setAddMaterialsOpen(true)}
            variant="contained"
            disableElevation
            startIcon={<AddRoundedIcon />}
            sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
          >
            Add Material
          </Button>
        </Stack>
      </Paper>

      {activeStore.materialKeys.length === 0 ? (
        <EmptyState
          icon={CategoryRoundedIcon}
          iconBg={colors.iconBlueBg}
          iconFg={colors.iconBlueFg}
          title="No materials or brands added yet."
          description="Add materials available at this store, then add brands, prices, and availability for each one."
          action={
            <Button onClick={() => setAddMaterialsOpen(true)} variant="contained" disableElevation startIcon={<AddRoundedIcon />} sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}>
              Add Material
            </Button>
          }
        />
      ) : (
        <Paper elevation={0} sx={{ borderRadius: 3, bgcolor: 'common.white', boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)', p: { xs: 1.5, md: 2.5 }, flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.76rem', sm: '0.85rem' }, mb: { xs: 1.5, sm: 2 } }}>
            {activeStore.materialKeys.length} materials stocked · {brandCount} with brands · {bulkCount} bulk material{bulkCount === 1 ? '' : 's'}
          </Typography>

          <Stack spacing={{ xs: 1, sm: 1.5 }}>
            {stockedMaterials.map((material) => {
              const data = activeStore.materialData[material.key] ?? {};
              // Collapsed by default on mobile (so opening the page doesn't
              // dump every material's full brand list at once) — desktop's
              // default-open behavior is untouched. Once a user has toggled
              // a specific material, that explicit choice wins on both.
              const isOpen = expanded[material.key] ?? !isMobile;

              if (isMobile) {
                return material.bulk ? (
                  <BulkMaterialMobileCard key={material.key} material={material} data={data} onOpenMenu={openRowMenu} />
                ) : (
                  <MaterialMobileCard
                    key={material.key}
                    material={material}
                    data={data}
                    isOpen={isOpen}
                    onToggle={() => toggleExpand(material.key)}
                    onRemove={() => handleRemoveMaterial(material.key)}
                    onOpenMenu={openRowMenu}
                    onAddBrand={() => setBrandDialog({ open: true, materialKey: material.key, brand: null })}
                  />
                );
              }

              if (material.bulk) {
                return (
                  <Paper key={material.key} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2, overflowX: 'auto' }}>
                    <Stack
                      direction="row"
                      spacing={1.5}
                      sx={{ alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' }, rowGap: { xs: 1.5, sm: 0 }, minWidth: { xs: 0, sm: 560 } }}
                    >
                      <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: colors.iconOrangeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CategoryRoundedIcon sx={{ color: colors.iconOrangeFg }} />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Typography sx={{ fontWeight: 700 }}>{material.name}</Typography>
                          <Chip label="Bulk" size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: colors.iconOrangeBg, color: colors.orange }} />
                        </Stack>
                        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>No brand selection · unit: {material.unit}</Typography>
                      </Box>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: colors.iconGreenFg, bgcolor: colors.iconGreenBg, px: 1.5, py: 0.5, borderRadius: 2 }}>
                        {formatPeso(data.price)}
                        <Typography component="span" sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 600 }}> /{material.unit}</Typography>
                      </Typography>
                      <AvailabilityChip available={data.available ?? true} />
                      <Tooltip title="Edit price / availability">
                        <IconButton size="small" onClick={() => setBulkDialog({ open: true, materialKey: material.key })}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove material">
                        <IconButton size="small" onClick={() => handleRemoveMaterial(material.key)}>
                          <DeleteOutlineRoundedIcon fontSize="small" color="error" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Paper>
                );
              }

              const brands = data.brands ?? [];
              return (
                <Paper key={material.key} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Stack
                      direction="row"
                      spacing={1.5}
                      onClick={() => toggleExpand(material.key)}
                      sx={{
                        alignItems: 'center',
                        flexWrap: { xs: 'wrap', sm: 'nowrap' },
                        rowGap: { xs: 1.5, sm: 0 },
                        minWidth: { xs: 0, sm: 480 },
                        p: 2,
                        bgcolor: 'grey.50',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'grey.100' },
                      }}
                    >
                      <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: colors.iconBlueBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CategoryRoundedIcon sx={{ color: colors.iconBlueFg }} />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontWeight: 700 }}>{material.name}</Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                          {brands.length} brand{brands.length === 1 ? '' : 's'} · unit: {material.unit}
                        </Typography>
                      </Box>
                      <Tooltip title="Remove material">
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveMaterial(material.key);
                          }}
                          sx={{ order: { xs: 1, sm: 2 } }}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" color="error" />
                        </IconButton>
                      </Tooltip>
                      <ExpandMoreRoundedIcon
                        sx={{
                          order: { xs: 2, sm: 3 },
                          flexShrink: 0,
                          transform: isOpen ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s ease',
                          color: 'text.secondary',
                        }}
                      />
                      <Button
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          setBrandDialog({ open: true, materialKey: material.key, brand: null });
                        }}
                        startIcon={<AddRoundedIcon />}
                        sx={{
                          order: 1,
                          display: { xs: 'none', sm: 'inline-flex' },
                          bgcolor: 'common.white',
                          border: '1px solid',
                          borderColor: 'grey.300',
                          color: 'text.primary',
                          flexShrink: 0,
                          '&:hover': { bgcolor: 'grey.50' },
                        }}
                      >
                        Add Brand
                      </Button>
                    </Stack>
                  </Box>

                  <Collapse in={isOpen}>
                    <Box sx={{ p: brands.length ? 1.5 : 0, overflowX: 'auto' }}>
                      {brands.length === 0 ? (
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', textAlign: 'center', py: 3 }}>
                          No brands added for {material.name} yet.
                        </Typography>
                      ) : (
                        <Stack spacing={1} sx={{ minWidth: { xs: 0, sm: 560 } }}>
                          {brands.map((brand) => (
                            <Stack
                              key={brand.id}
                              direction="row"
                              sx={{
                                alignItems: 'center',
                                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                                columnGap: 1.5,
                                rowGap: { xs: 1, sm: 0 },
                                p: 1.5,
                                borderRadius: 2,
                                '&:hover': { bgcolor: 'grey.50' },
                              }}
                            >
                              <Typography sx={{ order: 1, fontWeight: 700, fontSize: '0.9rem', minWidth: { xs: 0, sm: 140 } }}>
                                {brand.name}
                              </Typography>
                              {/* Mobile-only line breaks: force the rating, then the
                                  price, then the availability chip, each onto their own
                                  row — invisible and inert at sm+, where the row never wraps. */}
                              <Box sx={{ order: 2, flexBasis: '100%', height: 0, display: { xs: 'block', sm: 'none' } }} />
                              <Stars count={brand.stars} sx={{ order: 3 }} />
                              <Box sx={{ order: 4, flexBasis: '100%', height: 0, display: { xs: 'block', sm: 'none' } }} />
                              <Typography
                                sx={{
                                  order: 5,
                                  fontWeight: 800,
                                  fontSize: '0.9rem',
                                  color: colors.iconGreenFg,
                                  bgcolor: colors.iconGreenBg,
                                  px: 1.25,
                                  py: 0.25,
                                  borderRadius: 1.5,
                                }}
                              >
                                {formatPeso(brand.price)}
                                <Typography component="span" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}> /{brand.unit}</Typography>
                              </Typography>
                              <Box sx={{ order: 6, flexBasis: '100%', height: 0, display: { xs: 'block', sm: 'none' } }} />
                              <AvailabilityChip available={brand.available} sx={{ order: 7 }} />
                              <Box sx={{ order: 8, flex: 1, display: { xs: 'none', sm: 'block' } }} />
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  onClick={() => setBrandDialog({ open: true, materialKey: material.key, brand })}
                                  sx={{ order: 9, ml: { xs: 'auto', sm: 0 } }}
                                >
                                  <EditRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteBrand(material.key, brand.id)}
                                  sx={{ order: 10, mr: { xs: 0.5, sm: 0 } }}
                                >
                                  <DeleteOutlineRoundedIcon fontSize="small" color="error" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  </Collapse>
                </Paper>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* Mobile-only row action menu — shared by every bulk-material and
          brand card's kebab button (see openRowMenu/closeRowMenu above). */}
      <Menu anchorEl={rowMenu?.anchorEl} open={Boolean(rowMenu)} onClose={closeRowMenu} disableScrollLock>
        {rowMenu?.kind === 'bulk' && [
          <MenuItem
            key="edit"
            onClick={() => {
              setBulkDialog({ open: true, materialKey: rowMenu.materialKey });
              closeRowMenu();
            }}
          >
            <ListItemIcon><EditRoundedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Edit price / availability</ListItemText>
          </MenuItem>,
          <MenuItem
            key="remove"
            onClick={() => {
              handleRemoveMaterial(rowMenu.materialKey);
              closeRowMenu();
            }}
            sx={{ color: colors.iconRedFg }}
          >
            <ListItemIcon><DeleteOutlineRoundedIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Remove material</ListItemText>
          </MenuItem>,
        ]}
        {rowMenu?.kind === 'brand' && [
          <MenuItem
            key="edit"
            onClick={() => {
              setBrandDialog({ open: true, materialKey: rowMenu.materialKey, brand: rowMenu.brand });
              closeRowMenu();
            }}
          >
            <ListItemIcon><EditRoundedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Edit brand</ListItemText>
          </MenuItem>,
          <MenuItem
            key="delete"
            onClick={() => {
              handleDeleteBrand(rowMenu.materialKey, rowMenu.brand.id);
              closeRowMenu();
            }}
            sx={{ color: colors.iconRedFg }}
          >
            <ListItemIcon><DeleteOutlineRoundedIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Delete brand</ListItemText>
          </MenuItem>,
        ]}
      </Menu>

      <AddMaterialsDialog open={addMaterialsOpen} alreadyStocked={activeStore.materialKeys} onClose={() => setAddMaterialsOpen(false)} onSubmit={handleAddMaterials} />

      <BrandFormDialog
        open={brandDialog.open}
        materialName={getMaterialDefinition(brandDialog.materialKey)?.name ?? ''}
        unit={getMaterialDefinition(brandDialog.materialKey)?.unit ?? ''}
        brand={brandDialog.brand}
        onClose={() => setBrandDialog({ open: false, materialKey: null, brand: null })}
        onSubmit={handleSaveBrand}
      />

      <BulkMaterialDialog
        open={bulkDialog.open}
        materialName={getMaterialDefinition(bulkDialog.materialKey)?.name ?? ''}
        unit={getMaterialDefinition(bulkDialog.materialKey)?.unit ?? ''}
        data={activeStore.materialData[bulkDialog.materialKey]}
        onClose={() => setBulkDialog({ open: false, materialKey: null })}
        onSubmit={handleSaveBulk}
      />
    </Stack>
  );
}

export default AdminMaterialsPage;

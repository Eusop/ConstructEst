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
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import EmptyState from '../components/EmptyState';
import AddMaterialsDialog from '../components/AddMaterialsDialog';
import BrandFormDialog from '../components/BrandFormDialog';
import BulkMaterialDialog from '../components/BulkMaterialDialog';
import { useAdminStores } from '../context/AdminStoresContext';
import { useAdminActivity } from '../context/AdminActivityContext';
import { useAdminToast } from '../context/AdminToastContext';
import { getMaterialDefinition } from '../data/materialCatalog';
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

/**
 * Materials & Brands: the store-specific catalog (Store -> Material ->
 * Brand -> Price -> Availability, requirement 11). Locked behind an active
 * store (requirement 10) and, once unlocked, behind the store actually
 * having materials added (requirement 12) — Sand/Gravel skip the brand
 * layer entirely (requirement 13).
 */
function AdminMaterialsPage() {
  const navigate = useNavigate();
  const { stores, activeStore, addMaterialsToStore, removeMaterialFromStore, updateBulkMaterial, addBrand, updateBrand, removeBrand } = useAdminStores();
  const { logActivity } = useAdminActivity();
  const { showToast } = useAdminToast();

  const [expanded, setExpanded] = useState({});
  const [addMaterialsOpen, setAddMaterialsOpen] = useState(false);
  const [brandDialog, setBrandDialog] = useState({ open: false, materialKey: null, brand: null });
  const [bulkDialog, setBulkDialog] = useState({ open: false, materialKey: null });

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
      logActivity({ message: `Materials added to ${activeStore.name} — ${names}`, icon: CategoryRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg });
      showToast('Materials added to store');
    } catch {
      showToast('Could not add materials — try again', 'warning');
    }
  };

  const handleRemoveMaterial = async (key) => {
    try {
      await removeMaterialFromStore(activeStore.id, key);
      logActivity({ message: `Material removed from ${activeStore.name} — ${getMaterialDefinition(key)?.name}`, icon: DeleteOutlineRoundedIcon, iconBg: colors.iconRedBg, iconFg: colors.iconRedFg });
      showToast('Material removed from store', 'warning');
    } catch {
      showToast('Could not remove material — try again', 'warning');
    }
  };

  const handleSaveBrand = async (form) => {
    const { materialKey, brand } = brandDialog;
    setBrandDialog({ open: false, materialKey: null, brand: null });
    try {
      if (brand) {
        await updateBrand(activeStore.id, materialKey, brand.id, form);
      } else {
        await addBrand(activeStore.id, materialKey, form);
        logActivity({ message: `Brand added — ${form.name} (${getMaterialDefinition(materialKey)?.name}) · ${formatPeso(form.price)}`, icon: AddRoundedIcon, iconBg: colors.iconGreenBg, iconFg: colors.iconGreenFg });
      }
      showToast('Brand saved');
    } catch {
      showToast('Could not save brand — try again', 'warning');
    }
  };

  const handleDeleteBrand = async (materialKey, brandId) => {
    try {
      await removeBrand(activeStore.id, materialKey, brandId);
      showToast('Brand deleted', 'warning');
    } catch {
      showToast('Could not delete brand — try again', 'warning');
    }
  };

  const handleSaveBulk = async (form) => {
    setBulkDialog({ open: false, materialKey: null });
    try {
      await updateBulkMaterial(activeStore.id, bulkDialog.materialKey, form);
      logActivity({ message: `${getMaterialDefinition(bulkDialog.materialKey)?.name} updated at ${activeStore.name} — ${formatPeso(form.price)}`, icon: EditRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg });
      showToast('Material updated');
    } catch {
      showToast('Could not update material — try again', 'warning');
    }
  };

  const stockedMaterials = activeStore.materialKeys.map((key) => getMaterialDefinition(key)).filter(Boolean);
  const brandCount = stockedMaterials.filter((m) => !m.bulk).length;
  const bulkCount = stockedMaterials.filter((m) => m.bulk).length;

  return (
    <Stack spacing={2.5} sx={{ width: '100%', flex: 1, minHeight: 0 }}>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: 'text.primary' }}>Materials & Brands</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>Manage the materials, brands, prices, and availability for the active store.</Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          bgcolor: '#1f2433',
          color: '#fff',
          borderRadius: 3,
          p: 2.5,
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: colors.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <StorefrontRoundedIcon />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: '0.7rem', letterSpacing: 1, textTransform: 'uppercase', color: 'grey.400', fontWeight: 700 }}>Active store</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>{activeStore.name}</Typography>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <LocationOnRoundedIcon sx={{ fontSize: 14, color: 'grey.400', flexShrink: 0 }} />
              <Typography noWrap sx={{ fontSize: '0.8rem', color: 'grey.400' }}>{activeStore.address}</Typography>
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
        <Paper elevation={0} sx={{ borderRadius: 3, bgcolor: 'common.white', boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)', p: { xs: 2, md: 2.5 }, flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 2 }}>
            {activeStore.materialKeys.length} materials stocked · {brandCount} with brands · {bulkCount} bulk material{bulkCount === 1 ? '' : 's'}
          </Typography>

          <Stack spacing={1.5}>
            {stockedMaterials.map((material) => {
              const data = activeStore.materialData[material.key] ?? {};
              const isOpen = expanded[material.key] ?? true;

              if (material.bulk) {
                return (
                  <Paper key={material.key} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2, overflowX: 'auto' }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 560 }}>
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

                  {/* Mobile only — the header's own "Add Brand" button (sm+) is
                      hidden here; on mobile it reappears centered below the
                      brand cards instead. */}
                  <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'center', p: 2, pt: 0 }}>
                    <Button
                      size="small"
                      onClick={() => setBrandDialog({ open: true, materialKey: material.key, brand: null })}
                      startIcon={<AddRoundedIcon />}
                      sx={{
                        bgcolor: 'common.white',
                        border: '1px solid',
                        borderColor: 'grey.300',
                        color: 'text.primary',
                        '&:hover': { bgcolor: 'grey.50' },
                      }}
                    >
                      Add Brand
                    </Button>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        </Paper>
      )}

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

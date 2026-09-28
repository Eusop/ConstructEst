import { useNavigate } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { MATERIAL_CATALOG } from '../data/materialCatalog';
import { ADMIN_ROUTES } from '../../routes/paths';
import { useIsMobile } from '../../hooks/useIsMobile';
import { colors } from '../../theme/palette';

/**
 * Store details dialog: quick stats plus "Manage materials", the required
 * hand-off into Materials & Brands. There are two meanings of "active" here:
 * `onSetActive` only marks which store the Materials & Brands page is editing
 * (client-side selection), while `onToggleActiveRequest` is the real
 * store.isActive flag that decides if the store appears in price comparisons.
 */
function StoreDetailsDialog({ open, store, onClose, onSetActive, onEditRequest, onRemoveRequest, onToggleActiveRequest }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  if (!store) return null;
  const isDeactivated = store.isActive === false;

  const materialKeys = store.materialKeys ?? [];
  const brandCount = Object.values(store.materialData).reduce((sum, data) => sum + (data.brands ? data.brands.length : data.price != null ? 1 : 0), 0);

  const handleManage = () => {
    onSetActive(store.id);
    navigate(ADMIN_ROUTES.MATERIALS);
  };

  return (
    <Dialog open={open} onClose={onClose} disableScrollLock maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 6 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: colors.iconOrangeBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <StorefrontRoundedIcon sx={{ color: colors.iconOrangeFg }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>{store.name}</Typography>
            {isDeactivated && (
              <Chip label="Deactivated" size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'grey.100', color: 'text.secondary' }} />
            )}
          </Stack>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <LocationOnRoundedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }} noWrap>{store.address}</Typography>
          </Stack>
        </Box>
      </DialogTitle>
      <IconButton
        onClick={onClose}
        aria-label="Close"
        sx={{ position: 'absolute', top: 8, right: 8, color: 'text.secondary' }}
      >
        <CloseRoundedIcon />
      </IconButton>
      <DialogContent>
        <Stack spacing={0} divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', py: 1.5 }}>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>Materials stocked</Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
              {store.materialKeys === null ? '…' : `${materialKeys.length} of ${MATERIAL_CATALOG.length}`}
            </Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between', py: 1.5 }}>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>Brands / prices configured</Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{brandCount}</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between', py: 1.5, border: 'none' }}>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>Coordinates</Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{store.lat?.toFixed?.(4)}, {store.lng?.toFixed?.(4)}</Typography>
          </Stack>
        </Stack>

        {materialKeys.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>
              Inventory snapshot
            </Typography>
            {/* Mobile: a fixed 2-column grid instead of a flex-wrap row, so tags in a
                row share the same width and line up (labels vary from 4 to ~30
                characters). The long "CHB (Concrete Hollow Blocks)" spans both
                columns so it fits on one line. sm+ keeps the flex-wrap row. */}
            <Box
              sx={{
                display: { xs: 'grid', sm: 'flex' },
                gridTemplateColumns: { xs: 'repeat(2, 1fr)' },
                flexWrap: { sm: 'wrap' },
                gap: 1,
              }}
            >
              {materialKeys.map((key) => {
                const material = MATERIAL_CATALOG.find((item) => item.key === key);
                const label = material?.name ?? key;
                const isLong = label.length > 15;
                return (
                  <Chip
                    key={key}
                    label={label}
                    size="small"
                    sx={{
                      bgcolor: colors.iconGreenBg,
                      color: colors.iconGreenFg,
                      fontWeight: 600,
                      width: { xs: '100%', sm: 'auto' },
                      gridColumn: { xs: isLong ? '1 / -1' : 'auto' },
                      '& .MuiChip-label': {
                        width: { xs: '100%', sm: 'auto' },
                        textAlign: { xs: 'center', sm: 'left' },
                      },
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        )}
      </DialogContent>
      {/* Two rows: Edit/Deactivate/Remove share one (wrapping on narrow widths) and
          the primary action gets its own full-width row, so it isn't squeezed off
          the dialog's edge. */}
      <DialogActions sx={{ px: 3, pb: 3, flexDirection: 'column', alignItems: 'stretch', gap: 1.25 }}>
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            onClick={() => onEditRequest(store)}
            aria-label="Edit store"
            startIcon={<EditRoundedIcon />}
            sx={{
              color: 'text.secondary',
              '&:hover': { bgcolor: 'grey.100' },
              px: { xs: 1.25, sm: 2 },
              py: { xs: 0.5, sm: 1.5 },
              fontSize: { xs: '0.8rem', sm: '1.05rem' },
              whiteSpace: 'nowrap',
              minWidth: 0,
              '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Edit
            </Box>
          </Button>
          <Button
            onClick={() => onToggleActiveRequest(store)}
            aria-label={isDeactivated ? 'Reactivate store' : 'Deactivate store'}
            startIcon={isDeactivated ? <CheckCircleOutlineRoundedIcon /> : <BlockRoundedIcon />}
            sx={{
              color: isDeactivated ? colors.iconGreenFg : colors.iconOrangeFg,
              '&:hover': { bgcolor: isDeactivated ? colors.iconGreenBg : colors.iconOrangeBg },
              px: { xs: 1.25, sm: 2 },
              py: { xs: 0.5, sm: 1.5 },
              fontSize: { xs: '0.8rem', sm: '1.05rem' },
              whiteSpace: 'nowrap',
              minWidth: 0,
              '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {isDeactivated ? 'Reactivate' : 'Deactivate'}
            </Box>
          </Button>
          <Button
            onClick={() => onRemoveRequest(store.id)}
            aria-label="Remove store"
            startIcon={<DeleteOutlineRoundedIcon />}
            sx={{
              color: colors.iconRedFg,
              '&:hover': { bgcolor: colors.iconRedBg },
              px: { xs: 1.25, sm: 2 },
              py: { xs: 0.5, sm: 1.5 },
              fontSize: { xs: '0.8rem', sm: '1.05rem' },
              whiteSpace: 'nowrap',
              minWidth: 0,
              '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Remove store
            </Box>
          </Button>
        </Stack>
        {/* Labelled to say it only picks which store Materials & Brands edits. The
            Deactivate/Reactivate button above is what actually activates the store. */}
        <Button
          onClick={handleManage}
          variant="contained"
          disableElevation
          fullWidth
          disabled={isDeactivated}
          endIcon={<ArrowForwardRoundedIcon />}
          sx={{
            bgcolor: colors.accentBlue,
            '&:hover': { bgcolor: colors.accentBlueDark },
            py: { xs: 0.75, sm: 1.5 },
            fontSize: { xs: '0.85rem', sm: '1.05rem' },
          }}
        >
          {isDeactivated ? 'Reactivate to manage materials' : 'Manage materials'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default StoreDetailsDialog;

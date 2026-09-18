import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import { colors } from '../../../theme/palette';
import { formatPeso } from '../../../utils/formatNumbers';

function directionsUrl(store) {
  const { lat, lng } = store.position;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function BadgeNumber({ rank, color }) {
  return (
    <Box
      sx={{
        width: 26,
        height: 26,
        flexShrink: 0,
        borderRadius: '50%',
        bgcolor: color,
        color: 'common.white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.8rem',
        fontWeight: 700,
      }}
    >
      {rank}
    </Box>
  );
}

/**
 * One store in the comparison list — click selects it (highlighting this
 * card and the matching map marker). Selectable either way; a store
 * missing some materials still shows its (partial) total plus a warning
 * listing what it can't supply, rather than being blocked from selection.
 *
 * @param {object} props
 * @param {object} props.store One entry from features/storeLocator/data/storesMock.
 * @param {string} props.badgeColor
 * @param {boolean} props.selected
 * @param {() => void} props.onSelect
 */
function StoreListCard({ store, badgeColor, selected, onSelect }) {
  const availableAtStores = [...new Set(store.missingMaterials.flatMap((material) => material.availableAtStores ?? []))].sort();

  return (
    <Paper
      elevation={0}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect();
      }}
      sx={{
        borderRadius: 3,
        bgcolor: 'common.white',
        p: { xs: 1.5, sm: 2 },
        cursor: 'pointer',
        border: '1.5px solid',
        borderColor: selected ? colors.iconGreenFg : 'divider',
        boxShadow: selected ? `0 0 0 3px ${colors.iconGreenBg}` : '0 2px 10px rgba(20, 30, 60, 0.06)',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          <BadgeNumber rank={store.rank} color={badgeColor} />
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'text.primary', minWidth: 0, overflowWrap: 'anywhere' }}>{store.name}</Typography>
        </Stack>

        {store.isCheapest && (
          <Box sx={{ bgcolor: colors.iconGreenBg, color: colors.iconGreenFg, borderRadius: 999, px: 1.25, py: 0.3, flexShrink: 0 }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>Cheapest</Typography>
          </Box>
        )}
      </Stack>

      <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.15rem' }, color: 'text.primary', mt: { xs: 0.75, sm: 1 } }}>
        {formatPeso(store.totalCost)}
      </Typography>

      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: { xs: 0.25, sm: 0.5 } }}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <LocationOnRoundedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{store.distanceLabel}</Typography>
        </Stack>
        <Link
          href={directionsUrl(store)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          underline="hover"
          sx={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: colors.accentBlue,
            // Phone-only tap target. Scoped rather than applied flat so
            // sm+ keeps the plain inline <a> box it has always been.
            display: { xs: 'inline-flex', sm: 'inline' },
            alignItems: { xs: 'center', sm: 'baseline' },
            minHeight: { xs: 32, sm: 'auto' },
            px: { xs: 0.75, sm: 0 },
            mr: { xs: -0.75, sm: 0 },
            my: { xs: -0.5, sm: 0 },
          }}
        >
          Directions
        </Link>
      </Stack>

      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: { xs: 0.25, sm: 0.5 } }}>
        {store.inStock ? (
          <CheckCircleRoundedIcon sx={{ fontSize: 14, color: colors.iconGreenFg }} />
        ) : (
          <WarningAmberRoundedIcon sx={{ fontSize: 14, color: colors.orange }} />
        )}
        <Typography sx={{ fontSize: '0.8rem', color: store.inStock ? colors.iconGreenFg : colors.orangeDark, fontWeight: 600 }}>
          {store.stockLabel}
        </Typography>
      </Stack>

      {/* Missing-items detail — still selectable (see StoreLocatorPage's
          setSelectedStoreId, no longer blocked), this just makes clear what
          this store can't supply before the user commits to it. Store names
          are listed once as a deduplicated union across every missing item
          (not repeated per item) — a store missing many materials that all
          happen to be available at the same one or two alternatives reads
          as one short line instead of that alternative's name repeated
          once per item. */}
      {store.missingMaterials.length > 0 && (
        <Box sx={{ mt: { xs: 1, sm: 1.25 }, bgcolor: colors.iconOrangeBg, borderRadius: 2, p: { xs: 1, sm: 1.25 } }}>
          <Stack direction="row" spacing={0.75}>
            <WarningAmberRoundedIcon sx={{ fontSize: 16, color: colors.orange, flexShrink: 0, mt: 0.1 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.8rem', color: colors.orangeDark }}>
                Missing: {store.missingMaterials.map((material) => material.name).join(', ')}.
              </Typography>
              {availableAtStores.length > 0 && (
                <Typography sx={{ fontSize: '0.78rem', color: colors.orangeDark, fontWeight: 700, mt: 0.35 }}>
                  Available at: {availableAtStores.join(', ')}.
                </Typography>
              )}
            </Box>
          </Stack>
        </Box>
      )}
    </Paper>
  );
}

export default StoreListCard;

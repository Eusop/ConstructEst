import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import { colors } from '../../../theme/palette';

function formatPeso(value) {
  return `₱${Math.round(value).toLocaleString('en-PH')}`;
}

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
 * card and the matching map marker). Renders an out-of-stock variant when
 * the store can't fulfil the full material list.
 *
 * @param {object} props
 * @param {object} props.store One entry from features/storeLocator/data/storesMock.
 * @param {string} props.badgeColor
 * @param {boolean} props.selected
 * @param {() => void} props.onSelect
 */
function StoreListCard({ store, badgeColor, selected, onSelect }) {
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
        p: 2,
        cursor: 'pointer',
        border: '1.5px solid',
        borderColor: selected ? colors.iconGreenFg : 'divider',
        boxShadow: selected ? `0 0 0 3px ${colors.iconGreenBg}` : '0 2px 10px rgba(20, 30, 60, 0.06)',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <BadgeNumber rank={store.rank} color={badgeColor} />
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'text.primary' }}>{store.name}</Typography>
        </Stack>

        {store.isCheapest && (
          <Box sx={{ bgcolor: colors.iconGreenBg, color: colors.iconGreenFg, borderRadius: 999, px: 1.25, py: 0.3, flexShrink: 0 }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>Cheapest</Typography>
          </Box>
        )}
      </Stack>

      {store.inStock ? (
        <>
          <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: 'text.primary', mt: 1 }}>
            {formatPeso(store.totalCost)}
          </Typography>

          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
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
              sx={{ fontSize: '0.8rem', fontWeight: 600, color: colors.accentBlue }}
            >
              Directions
            </Link>
          </Stack>

          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.5 }}>
            <CheckCircleRoundedIcon sx={{ fontSize: 14, color: colors.iconGreenFg }} />
            <Typography sx={{ fontSize: '0.8rem', color: colors.iconGreenFg, fontWeight: 600 }}>{store.stockLabel}</Typography>
          </Stack>
        </>
      ) : (
        <Box sx={{ mt: 1.25, bgcolor: colors.iconOrangeBg, borderRadius: 2, p: 1.25 }}>
          <Stack direction="row" spacing={0.75}>
            <WarningAmberRoundedIcon sx={{ fontSize: 16, color: colors.orange, flexShrink: 0, mt: 0.1 }} />
            <Typography sx={{ fontSize: '0.8rem', color: colors.orangeDark }}>
              No {store.outOfStockMaterial} in stock. Try{' '}
              <Box component="span" sx={{ fontWeight: 700 }}>
                {store.suggestedStoreName}
              </Box>{' '}
              for this item.
            </Typography>
          </Stack>
        </Box>
      )}
    </Paper>
  );
}

export default StoreListCard;

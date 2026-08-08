import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import DiamondRoundedIcon from '@mui/icons-material/DiamondRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import { OPTIMIZATION_TIERS } from '../data/brandOptionsMock';
import { computeTierTotal } from '../utils/computeBom';
import { colors } from '../../../theme/palette';

const TIER_ICONS = {
  premium: { Icon: DiamondRoundedIcon, bg: colors.iconPurpleBg, fg: colors.iconPurpleFg },
  standard: { Icon: StarRoundedIcon, bg: colors.iconBlueBg, fg: colors.iconBlueFg },
  budget: { Icon: SavingsRoundedIcon, bg: colors.iconGreenBg, fg: colors.iconGreenFg },
};

function formatPeso(value) {
  return `₱${Math.round(value).toLocaleString('en-PH')}`;
}

/**
 * Premium / Standard / Budget selectable tier cards — each maps to a fixed
 * brand choice per material (see OPTIMIZATION_TIERS); totals are computed
 * live, not hardcoded.
 *
 * @param {object} props
 * @param {string} props.selectedTier
 * @param {(tierKey: string) => void} props.onSelectTier
 * @param {string} props.storeId Which store's brand catalog to price against.
 */
function OptimizationTierCards({ selectedTier, onSelectTier, storeId }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      {Object.values(OPTIMIZATION_TIERS).map((tier) => {
        const { Icon, bg, fg } = TIER_ICONS[tier.key];
        const selected = tier.key === selectedTier;
        const total = computeTierTotal(tier.key, storeId);

        return (
          <Paper
            key={tier.key}
            elevation={0}
            onClick={() => onSelectTier(tier.key)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onSelectTier(tier.key);
            }}
            sx={{
              flex: 1,
              borderRadius: 3,
              bgcolor: 'common.white',
              p: 2.25,
              cursor: 'pointer',
              border: '1.5px solid',
              borderColor: selected ? colors.accentBlue : 'transparent',
              boxShadow: selected ? `0 0 0 3px ${colors.iconBlueBg}` : '0 2px 10px rgba(20, 30, 60, 0.06)',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
              <Box
                sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon sx={{ color: fg, fontSize: 20 }} />
              </Box>
              {tier.recommended && (
                <Box sx={{ bgcolor: colors.iconGreenBg, color: colors.iconGreenFg, borderRadius: 999, px: 1.1, py: 0.3 }}>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>Recommended</Typography>
                </Box>
              )}
            </Stack>

            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>{tier.label}</Typography>
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 1.25, minHeight: 36 }}>
              {tier.description}
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: 'text.primary' }}>{formatPeso(total)}</Typography>
          </Paper>
        );
      })}
    </Stack>
  );
}

export default OptimizationTierCards;

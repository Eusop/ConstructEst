import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import DiamondRoundedIcon from '@mui/icons-material/DiamondRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import { OPTIMIZATION_TIERS } from '../data/brandOptionsCache';
import { computeTierTotal } from '../utils/computeBom';
import { colors } from '../../../theme/palette';
import { formatPeso } from '../../../utils/formatNumbers';

const TIER_ICONS = {
  premium: { Icon: DiamondRoundedIcon, bg: colors.iconPurpleBg, fg: colors.iconPurpleFg },
  standard: { Icon: StarRoundedIcon, bg: colors.iconBlueBg, fg: colors.iconBlueFg },
  budget: { Icon: SavingsRoundedIcon, bg: colors.iconGreenBg, fg: colors.iconGreenFg },
};

/**
 * Premium / Standard / Budget tier cards. Each maps to a fixed brand choice per
 * material (see OPTIMIZATION_TIERS), and totals are computed live.
 *
 * @param {object} props
 * @param {string} props.selectedTier
 * @param {(tierKey: string) => void} props.onSelectTier
 * @param {string} props.storeId Which store's brand catalog to price against.
 * @param {Record<string, number>|null} [props.realUnitPrices] The store's real
 *   per-material prices from the backend's BOM, used for the materials that
 *   have no brand options (sand/gravel) so these totals agree with the Bill
 *   of Materials page instead of pricing those two from flat literals.
 */
function OptimizationTierCards({ selectedTier, onSelectTier, storeId, realUnitPrices = null }) {
  return (
    // A row at every size: below `sm` all three cards shrink into one horizontal
    // row (description dropped, "Recommended" as a small caption under the label,
    // smaller icon and text). `sm`+ is unchanged; every mobile tweak below is
    // gated behind that breakpoint.
    <Stack direction="row" spacing={{ xs: 0.75, sm: 2 }}>
      {Object.values(OPTIMIZATION_TIERS).map((tier) => {
        const { Icon, bg, fg } = TIER_ICONS[tier.key];
        const selected = tier.key === selectedTier;
        const total = computeTierTotal(tier.key, storeId, realUnitPrices);

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
              minWidth: 0,
              borderRadius: { xs: 2, sm: 3 },
              bgcolor: 'common.white',
              p: { xs: 1, sm: 2.25 },
              cursor: 'pointer',
              border: '1.5px solid',
              borderColor: selected ? colors.accentBlue : 'transparent',
              boxShadow: selected ? `0 0 0 3px ${colors.iconBlueBg}` : '0 2px 10px rgba(20, 30, 60, 0.06)',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: { xs: 0.5, sm: 1.25 } }}>
              <Box
                sx={{
                  width: { xs: 24, sm: 40 },
                  height: { xs: 24, sm: 40 },
                  borderRadius: { xs: 1.25, sm: 2 },
                  bgcolor: bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon sx={{ color: fg, fontSize: { xs: 13, sm: 20 } }} />
              </Box>
              {/* Desktop/tablet only: no room for a pill beside a 24px icon on a phone
                  (the mobile version is the caption under the label below). */}
              {tier.recommended && (
                <Box sx={{ display: { xs: 'none', sm: 'block' }, bgcolor: colors.iconGreenBg, color: colors.iconGreenFg, borderRadius: 999, px: 1.1, py: 0.3 }}>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>Recommended</Typography>
                </Box>
              )}
            </Stack>

            <Typography noWrap sx={{ fontWeight: 700, fontSize: { xs: '0.74rem', sm: '1rem' }, color: 'text.primary' }}>
              {tier.label}
            </Typography>

            {/* Mobile only: price first, then the "Recommended" caption, so the
                number people compare reads first. Desktop's price stays below the
                description (see the two `sm`-only blocks after this). */}
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.7rem', color: 'text.primary', mt: 0.5 }}>
                {formatPeso(total)}
              </Typography>
              {tier.recommended && (
                // Was 0.56rem, too small to read on a phone. Now the smallest
                // caption size used elsewhere in the app.
                <Typography sx={{ fontSize: '0.64rem', fontWeight: 700, color: colors.iconGreenFg, lineHeight: 1.4, mt: 0.25 }}>
                  Recommended
                </Typography>
              )}
            </Box>

            {/* Description dropped on mobile (not enough width without making the
                card tall). The name, price and "Recommended" caption say what
                matters; the full description shows once selected. */}
            <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontSize: '0.82rem', color: 'text.secondary', mb: 1.25, minHeight: 36 }}>
              {tier.description}
            </Typography>

            <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 800, fontSize: '1.15rem', color: 'text.primary' }}>
              {formatPeso(total)}
            </Typography>
          </Paper>
        );
      })}
    </Stack>
  );
}

export default OptimizationTierCards;

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
    // Row at every size now (was xs: column) — below `sm`, all three cards
    // shrink to fit one horizontal row instead of stacking full-width; the
    // per-card content below is what actually makes that legible rather
    // than just squeezing the desktop card smaller (description dropped,
    // "Recommended" moved from a top-right pill to a small caption under
    // the label, icon/text sized down). `sm`+ is completely untouched —
    // every mobile-only tweak below is gated behind that breakpoint.
    <Stack direction="row" spacing={{ xs: 0.75, sm: 2 }}>
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
              {/* Desktop/tablet only — no room for a pill beside a 24px icon
                  on a phone; see the compact caption under the label below
                  for the mobile equivalent. */}
              {tier.recommended && (
                <Box sx={{ display: { xs: 'none', sm: 'block' }, bgcolor: colors.iconGreenBg, color: colors.iconGreenFg, borderRadius: 999, px: 1.1, py: 0.3 }}>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>Recommended</Typography>
                </Box>
              )}
            </Stack>

            <Typography noWrap sx={{ fontWeight: 700, fontSize: { xs: '0.74rem', sm: '1rem' }, color: 'text.primary' }}>
              {tier.label}
            </Typography>

            {/* Mobile only: price first, "Recommended" caption below it —
                swapped from the reverse order so the number (what users
                actually compare) reads first. Desktop's own price stays in
                its original position below the description, untouched —
                see the two `sm`-only blocks after this one. */}
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.7rem', color: 'text.primary', mt: 0.5 }}>
                {formatPeso(total)}
              </Typography>
              {tier.recommended && (
                // Was 0.56rem — below comfortable reading size on a phone
                // screen even for one short word; bumped to the smallest
                // size still used elsewhere in the app for captions.
                <Typography sx={{ fontSize: '0.64rem', fontWeight: 700, color: colors.iconGreenFg, lineHeight: 1.4, mt: 0.25 }}>
                  Recommended
                </Typography>
              )}
            </Box>

            {/* Description dropped on mobile (not enough width for it to
                wrap without ballooning card height) — the tier name, price,
                and "Recommended" caption already say what matters at a
                glance; the full description is one tap away once selected. */}
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

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { colors } from '../../../theme/palette';

/**
 * Dark cost summary banner: the estimated material cost, the project's
 * budget ceiling + within/over-budget indicator, and the "View estimate"
 * action, laid out as three columns in a single row — cost on the left,
 * budget info in the middle, the call to action on the far right — all
 * vertically centered within the card.
 *
 * @param {object} props
 * @param {string} props.estimatedCost Formatted cost, e.g. "₱1,500,250".
 * @param {string} props.ceilingLabel Formatted ceiling, e.g. "₱1.6M".
 * @param {boolean} props.withinBudget
 * @param {() => void} props.onViewEstimate
 */
function EstimatedCostBanner({ estimatedCost, ceilingLabel, withinBudget, onViewEstimate }) {
  const statusColor = withinBudget ? colors.iconGreenFg : colors.iconRedFg;

  return (
    <Box sx={{ borderRadius: 3, bgcolor: colors.ctaBackground, p: { xs: 2.5, md: 3 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 2.25, sm: 3 }}
        sx={{
          justifyContent: 'space-between',
          // xs: 'stretch' so the nested Stack below (budget info + button)
          // spans the card's full width instead of shrink-wrapping to its
          // content — otherwise the button's own width:100% (further down)
          // has nothing full-width to fill. sm+ unchanged from the original
          // flat 'flex-start'.
          alignItems: { xs: 'stretch', sm: 'flex-start' },
        }}
      >
        <Box>
          <Typography sx={{ fontSize: '0.78rem', color: 'grey.500' }}>Estimated material cost</Typography>
          <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: 'common.white' }}>{estimatedCost}</Typography>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2.25, sm: 2 }}
          sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
        >
          <Box>
            <Typography sx={{ fontSize: '0.78rem', color: 'grey.500' }}>Budget ceiling</Typography>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: 'common.white' }}>{ceilingLabel}</Typography>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.75 }}>
              <CheckCircleRoundedIcon sx={{ fontSize: 14, color: statusColor }} />
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: statusColor }}>
                {withinBudget ? 'Within budget' : 'Over budget'}
              </Typography>
            </Stack>
          </Box>

          <Button
            onClick={onViewEstimate}
            variant="contained"
            disableElevation
            startIcon={<ArrowForwardRoundedIcon />}
            sx={{
              bgcolor: colors.accentBlue,
              '&:hover': { bgcolor: colors.accentBlueDark },
              flexShrink: 0,
              // Full-bleed primary CTA on phones, same convention as this
              // app's other mobile "Continue"/"Download" actions (Store
              // Locator, Brand Selection, Bill of Materials) — was
              // auto-width here, which left it small and off-balance,
              // stranded with empty space to its right.
              width: { xs: '100%', sm: 'auto' },
              minHeight: { xs: 46, sm: 'auto' },
            }}
          >
            View estimate
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

export default EstimatedCostBanner;

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { colors } from '../../../theme/palette';

function SummaryRow({ label, value, valueColor = 'common.white' }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
      <Typography sx={{ fontSize: '0.85rem', color: 'grey.500' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: valueColor, textAlign: 'right' }}>{value}</Typography>
    </Stack>
  );
}

/**
 * Dark cost breakdown: raw subtotal, the optimization saving applied, and
 * the final grand total against the project's budget ceiling — with the
 * "Download PDF report" action on the same row as the grand total, on the
 * opposite end.
 *
 * @param {object} props
 * @param {string} props.subtotalLabel Formatted, e.g. "₱1,725,820".
 * @param {string} props.savingLabel Formatted, e.g. "–₱252,920".
 * @param {string} props.grandTotalLabel Formatted, e.g. "₱1,472,900".
 * @param {string} props.ceilingDeltaLabel e.g. "₱127,100 under ceiling".
 * @param {boolean} props.withinBudget
 * @param {() => void} props.onDownloadPdf
 */
function BomCostSummaryCard({ subtotalLabel, savingLabel, grandTotalLabel, ceilingDeltaLabel, withinBudget, onDownloadPdf }) {
  const deltaColor = withinBudget ? colors.iconGreenFg : colors.iconRedFg;

  return (
    <Box sx={{ borderRadius: 3, bgcolor: colors.ctaBackground, p: { xs: 2.5, md: 3 } }}>
      <Stack spacing={1.25}>
        <SummaryRow label="Subtotal" value={subtotalLabel} />
        <SummaryRow label="Optimization saving" value={savingLabel} valueColor={colors.iconGreenFg} />
      </Stack>

      <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
      >
        <Box>
          <Typography sx={{ fontSize: '0.85rem', color: 'grey.500' }}>Grand total</Typography>
          <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: 'common.white' }}>{grandTotalLabel}</Typography>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.5 }}>
            <CheckCircleRoundedIcon sx={{ fontSize: 15, color: deltaColor }} />
            <Typography sx={{ fontSize: '0.8rem', color: deltaColor }}>{ceilingDeltaLabel}</Typography>
          </Stack>
        </Box>

        <Button
          onClick={onDownloadPdf}
          variant="contained"
          disableElevation
          startIcon={<DownloadRoundedIcon />}
          sx={{
            bgcolor: colors.accentBlue,
            '&:hover': { bgcolor: colors.accentBlueDark },
            flexShrink: 0,
            whiteSpace: 'nowrap',
            fontSize: { xs: '0.9rem', sm: '1.05rem' },
          }}
        >
          Download PDF report
        </Button>
      </Stack>
    </Box>
  );
}

export default BomCostSummaryCard;

import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import { colors } from '../../../theme/palette';
import { CALIBRATION_DEFAULTS } from '../../settings/data/calibrationDefaults';

const FACTORS = [
  { label: 'cement', value: String(CALIBRATION_DEFAULTS.cement) },
  { label: 'steel', value: String(CALIBRATION_DEFAULTS.steel) },
  { label: 'roofing', value: String(CALIBRATION_DEFAULTS.roofing) },
  { label: 'wastage', value: `${CALIBRATION_DEFAULTS.wastage}%` },
];

/**
 * Info banner summarizing the calibration factors applied when computing
 * the quantity take-off.
 */
function FactorsAppliedBanner() {
  return (
    <Paper
      elevation={0}
      sx={{ borderRadius: 3, bgcolor: colors.iconBlueBg, p: 2, display: 'flex', gap: 1.25, alignItems: 'center' }}
    >
      <CalculateRoundedIcon sx={{ color: colors.iconBlueFg, fontSize: 20, flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.85rem', color: colors.iconBlueFg }}>
        Factors applied —{' '}
        {FACTORS.map((factor, index) => (
          <Box key={factor.label} component="span">
            {factor.label}{' '}
            <Box component="span" sx={{ fontWeight: 700 }}>
              {factor.value}
            </Box>
            {index < FACTORS.length - 1 ? ', ' : '.'}
          </Box>
        ))}
      </Typography>
    </Paper>
  );
}

export default FactorsAppliedBanner;

import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import { colors } from '../../../theme/palette';

/**
 * Info banner summarizing the calibration factors applied when computing
 * the quantity take-off currently on screen.
 *
 * @param {object} props
 * @param {{cement: number, steel: number, roofing: number, wastage: number}} props.factors
 */
function FactorsAppliedBanner({ factors }) {
  const items = [
    { label: 'cement', value: String(factors.cement) },
    { label: 'steel', value: String(factors.steel) },
    { label: 'roofing', value: String(factors.roofing) },
    { label: 'wastage', value: `${factors.wastage}%` },
  ];

  return (
    <Paper
      elevation={0}
      sx={{ borderRadius: 3, bgcolor: colors.iconBlueBg, p: 2, display: 'flex', gap: 1.25, alignItems: 'center' }}
    >
      <CalculateRoundedIcon sx={{ color: colors.iconBlueFg, fontSize: 20, flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.85rem', color: colors.iconBlueFg }}>
        Factors applied —{' '}
        {items.map((factor, index) => (
          <Box key={factor.label} component="span">
            {factor.label}{' '}
            <Box component="span" sx={{ fontWeight: 700 }}>
              {factor.value}
            </Box>
            {index < items.length - 1 ? ', ' : '.'}
          </Box>
        ))}
      </Typography>
    </Paper>
  );
}

export default FactorsAppliedBanner;

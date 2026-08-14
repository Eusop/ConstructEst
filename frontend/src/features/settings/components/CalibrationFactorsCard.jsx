import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';
import Link from '@mui/material/Link';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import { colors } from '../../../theme/palette';

const FACTOR_FIELDS = [
  { key: 'cement', label: 'Cement factor', min: 1, max: 1.3, step: 0.01, color: colors.accentBlue, format: (v) => v.toFixed(2) },
  { key: 'steel', label: 'Steel factor', min: 1, max: 1.3, step: 0.01, color: colors.accentBlue, format: (v) => v.toFixed(2) },
  { key: 'roofing', label: 'Roofing factor', min: 1, max: 1.3, step: 0.01, color: colors.iconTealFg, format: (v) => v.toFixed(2) },
  { key: 'wastage', label: 'Wastage factor', min: 0, max: 15, step: 0.5, color: colors.orange, format: (v) => `${v}%` },
];

/**
 * "Calibration factors" card: the multipliers the rule-based engine
 * applies during quantity take-off, editable via sliders.
 *
 * @param {object} props
 * @param {{cement: number, steel: number, roofing: number, wastage: number}} props.factors
 * @param {(key: string, value: number) => void} props.onFactorChange
 * @param {() => void} props.onResetDefaults
 */
function CalibrationFactorsCard({ factors, onFactorChange, onResetDefaults }) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        bgcolor: 'common.white',
        boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
        p: { xs: 2.5, md: 4 },
        flex: 1,
        minHeight: 480,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1, sm: 0 }}
        sx={{ alignItems: { xs: 'flex-start', sm: 'flex-start' }, justifyContent: 'space-between', gap: 2, flexShrink: 0 }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: 'text.primary' }}>Calibration factors</Typography>
        <Link
          component="button"
          type="button"
          onClick={onResetDefaults}
          underline="none"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.82rem', fontWeight: 600, color: colors.accentBlue, flexShrink: 0 }}
        >
          <RestartAltRoundedIcon sx={{ fontSize: 16 }} />
          Reset to admin defaults
        </Link>
      </Stack>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 3, flexShrink: 0 }}>
        Multipliers the rule-based engine applies during take-off.
      </Typography>

      <Stack spacing={4} sx={{ flex: 1, justifyContent: 'center', width: '100%' }}>
        {FACTOR_FIELDS.map((field) => (
          <Box key={field.key}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'text.primary' }}>{field.label}</Typography>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: field.color }}>
                {field.format(factors[field.key])}
              </Typography>
            </Stack>
            <Slider
              value={factors[field.key]}
              onChange={(event, value) => onFactorChange(field.key, value)}
              min={field.min}
              max={field.max}
              step={field.step}
              sx={{ color: field.color, py: 0.5 }}
            />
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

export default CalibrationFactorsCard;

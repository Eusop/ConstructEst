import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';
import Link from '@mui/material/Link';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import { colors } from '../../../theme/palette';

// Shown as "+N%" (how much extra this buys above the bare rule-based
// formula) instead of the raw 1.0x-1.3x multiplier the backend actually
// stores/sends — "1.05" reads as an arbitrary number on first use, "+5%"
// doesn't need translating.
function formatPercentAboveBase(multiplier) {
  const pct = Math.round((multiplier - 1) * 100);
  return pct === 0 ? '0% (none)' : `+${pct}%`;
}

function formatPercent(value) {
  return value === 0 ? '0% (none)' : `+${value}%`;
}

const FACTOR_FIELDS = [
  { key: 'cement', label: 'Cement factor', min: 1, max: 1.3, step: 0.01, color: colors.accentBlue, format: formatPercentAboveBase },
  { key: 'steel', label: 'Steel factor', min: 1, max: 1.3, step: 0.01, color: colors.accentBlue, format: formatPercentAboveBase },
  { key: 'roofing', label: 'Roofing factor', min: 1, max: 1.3, step: 0.01, color: colors.iconTealFg, format: formatPercentAboveBase },
  { key: 'wastage', label: 'Wastage factor', min: 0, max: 15, step: 0.5, color: colors.orange, format: formatPercent },
];

/**
 * "Calibration factors" card: the multipliers the rule-based engine
 * applies during quantity take-off, editable via sliders. Each slider's
 * left edge (0%) is the bare formula with no extra added — the displayed
 * value is how much material that factor buys on top of that, which is
 * what actually varies, not the underlying 1.0x-1.3x multiplier the
 * backend stores.
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
        How much extra material each category buys above the bare rule-based formula, to
        cover real-world waste — 0% uses the formula exactly as written.
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
            <Stack direction="row" sx={{ justifyContent: 'space-between', mt: -0.5 }}>
              <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>0% · no adjustment</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>{field.format(field.max)}</Typography>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

export default CalibrationFactorsCard;

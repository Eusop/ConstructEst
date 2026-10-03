import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import { colors } from '../../../theme/palette';

const USES = [1, 2, 3];

/**
 * "Formwork uses" picker for the Bill of Materials. The engineers said forms
 * can be reused about 3 times when member sizes repeat (2026-10-03 meeting),
 * so the plywood and lumber price is divided by the number picked. The
 * quantity stays the same.
 *
 * @param {object} props
 * @param {number} props.value 1, 2 or 3.
 * @param {(uses: number) => void} props.onChange
 * @param {boolean} [props.disabled] True while the new prices load.
 */
function FormworkUsesSelect({ value, onChange, disabled = false }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 1, sm: 2 }}
      sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
    >
      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary' }}>Formwork uses</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
          Plywood and lumber can be reused when column and beam sizes repeat. Their price is divided by the number of uses.
        </Typography>
      </Stack>
      <ToggleButtonGroup
        value={value}
        exclusive
        size="small"
        disabled={disabled}
        onChange={(event, next) => next !== null && onChange(next)}
        aria-label="Formwork uses"
        sx={{
          flexShrink: 0,
          '& .MuiToggleButton-root': { px: 2, fontWeight: 700, textTransform: 'none' },
          '& .Mui-selected': { color: `${colors.accentBlue} !important` },
        }}
      >
        {USES.map((uses) => (
          <ToggleButton key={uses} value={uses} aria-label={`${uses} ${uses === 1 ? 'use' : 'uses'}`}>
            {uses}×
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}

export default FormworkUsesSelect;

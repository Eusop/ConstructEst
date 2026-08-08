import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { colors } from '../../../theme/palette';

/**
 * Automatic (tier presets) / Manual (per-material dropdowns) segmented
 * toggle for Brand Selection.
 *
 * @param {object} props
 * @param {'automatic'|'manual'} props.mode
 * @param {(mode: 'automatic'|'manual') => void} props.onModeChange
 */
function BrandModeToggle({ mode, onModeChange }) {
  return (
    <ToggleButtonGroup
      value={mode}
      exclusive
      onChange={(event, value) => value && onModeChange(value)}
      sx={{
        bgcolor: 'grey.100',
        borderRadius: 999,
        p: 0.5,
        '& .MuiToggleButtonGroup-grouped': {
          border: 0,
          borderRadius: 999,
          textTransform: 'none',
          fontWeight: 700,
          fontSize: '0.85rem',
          color: 'text.secondary',
          px: 2,
          '&.Mui-selected': {
            bgcolor: 'common.white',
            color: colors.accentBlue,
            boxShadow: '0 1px 4px rgba(20, 30, 60, 0.12)',
            '&:hover': { bgcolor: 'common.white' },
          },
        },
      }}
    >
      <ToggleButton value="automatic" disableRipple>
        <AutoAwesomeRoundedIcon sx={{ fontSize: 17, mr: 0.75 }} />
        Automatic
      </ToggleButton>
      <ToggleButton value="manual" disableRipple>
        <TuneRoundedIcon sx={{ fontSize: 17, mr: 0.75 }} />
        Manual
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

export default BrandModeToggle;

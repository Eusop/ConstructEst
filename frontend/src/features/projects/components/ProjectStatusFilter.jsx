import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import { colors } from '../../../theme/palette';

const OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'complete', label: 'Complete' },
  { value: 'incomplete', label: 'Incomplete' },
];

/**
 * All / Complete / Incomplete segmented filter for the Projects page's
 * project list — same pill-toggle treatment as BrandModeToggle (grey.100
 * track, white-and-accent-blue selected pill), so it reads as the same
 * kind of control elsewhere in the app rather than a new pattern.
 *
 * @param {object} props
 * @param {'all'|'complete'|'incomplete'} props.value
 * @param {(value: 'all'|'complete'|'incomplete') => void} props.onChange
 */
function ProjectStatusFilter({ value, onChange }) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(event, next) => next && onChange(next)}
      sx={{
        bgcolor: 'grey.100',
        borderRadius: 999,
        p: 0.5,
        '& .MuiToggleButtonGroup-grouped': {
          border: 0,
          borderRadius: 999,
          textTransform: 'none',
          fontWeight: 700,
          fontSize: '0.82rem',
          color: 'text.secondary',
          px: 1.75,
          '&.Mui-selected': {
            bgcolor: 'common.white',
            color: colors.accentBlue,
            boxShadow: '0 1px 4px rgba(20, 30, 60, 0.12)',
            '&:hover': { bgcolor: 'common.white' },
          },
        },
      }}
    >
      {OPTIONS.map((option) => (
        <ToggleButton key={option.value} value={option.value} disableRipple>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

export default ProjectStatusFilter;

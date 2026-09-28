import Box from '@mui/material/Box';
import { colors } from '../../../theme/palette';

const STATUS_COLORS = {
  Complete: { bg: colors.iconGreenBg, fg: colors.iconGreenFg },
  Incomplete: { bg: 'grey.100', fg: 'text.secondary' },
};

/**
 * Small colour-coded status pill for the Projects page cards (only used by
 * ProjectCard). "Complete" means a saved brand selection and generated BOM
 * (`status === 'Optimized'` in ProjectsContext); every other state (parsing,
 * estimated without brand selection, failed) reads "Incomplete". ProjectCard
 * maps the real status to one of these labels; this only renders it. Any other
 * label falls back to a neutral grey.
 *
 * @param {object} props
 * @param {'Complete' | 'Incomplete'} props.label
 */
function StatusChip({ label }) {
  const { bg, fg } = STATUS_COLORS[label] ?? { bg: 'grey.100', fg: 'text.secondary' };

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        bgcolor: bg,
        color: fg,
        fontSize: '0.78rem',
        fontWeight: 700,
        borderRadius: 999,
        px: 1.5,
        py: 0.4,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Box>
  );
}

export default StatusChip;

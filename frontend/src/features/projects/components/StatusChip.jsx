import Box from '@mui/material/Box';
import { colors } from '../../../theme/palette';

const STATUS_COLORS = {
  Complete: { bg: colors.iconGreenBg, fg: colors.iconGreenFg },
  Incomplete: { bg: 'grey.100', fg: 'text.secondary' },
};

/**
 * Small colour-coded status pill for the Projects page's project cards
 * (see ProjectCard, its only consumer). "Complete" only for a project with
 * a saved brand selection and generated Bill of Materials (`status ===
 * 'Optimized'` in ProjectsContext); every other project state — still
 * parsing, estimated but no brand selection yet, or failed to parse — reads
 * "Incomplete". ProjectCard is what maps the real project status into one
 * of these two labels; this component just renders whichever it's given.
 * Falls back to a neutral grey tone for any other, unexpected label.
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

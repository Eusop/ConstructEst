import Box from '@mui/material/Box';
import { colors } from '../../../theme/palette';

const STATUS_COLORS = {
  Within: { bg: colors.iconGreenBg, fg: colors.iconGreenFg },
  Over: { bg: colors.iconRedBg, fg: colors.iconRedFg },
  Estimated: { bg: colors.iconBlueBg, fg: colors.iconBlueFg },
  Optimized: { bg: colors.iconGreenBg, fg: colors.iconGreenFg },
  Parsing: { bg: colors.iconOrangeBg, fg: colors.iconOrangeFg },
  Shared: { bg: colors.iconPurpleBg, fg: colors.iconPurpleFg },
};

/**
 * Small colour-coded status pill, used for both the "Budget" and "Status"
 * table columns. Falls back to a neutral grey tone for unknown values.
 *
 * @param {object} props
 * @param {string} props.label One of the known status keywords (Within, Over, Estimated, ...).
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

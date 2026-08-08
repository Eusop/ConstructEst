import Box from '@mui/material/Box';
import CottageRoundedIcon from '@mui/icons-material/CottageRounded';
import { colors } from '../../../theme/palette';

const ICON_COLORS = {
  blue: { bg: colors.iconBlueBg, fg: colors.iconBlueFg },
  green: { bg: colors.iconGreenBg, fg: colors.iconGreenFg },
  orange: { bg: colors.iconOrangeBg, fg: colors.iconOrangeFg },
  purple: { bg: colors.iconPurpleBg, fg: colors.iconPurpleFg },
};

/**
 * Small colour-coded rounded tile representing a project (table rows,
 * summary cards, ...).
 *
 * @param {object} props
 * @param {'blue'|'green'|'orange'|'purple'} [props.color='blue']
 * @param {number} [props.size=40]
 */
function ProjectIcon({ color = 'blue', size = 40 }) {
  const { bg, fg } = ICON_COLORS[color] ?? ICON_COLORS.blue;
  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 2,
        bgcolor: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CottageRoundedIcon sx={{ color: fg, fontSize: size * 0.5 }} />
    </Box>
  );
}

export default ProjectIcon;

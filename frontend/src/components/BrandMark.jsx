import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ArchitectureRoundedIcon from '@mui/icons-material/ArchitectureRounded';
import { colors } from '../theme/palette';

/**
 * ConstructEst marketing-site brand mark: an orange icon tile followed by
 * the "ConstructEst" wordmark. Used by the public Navbar/Footer.
 *
 * (The auth/dashboard header uses the original house-and-bars `Logo`
 * component — this is a distinct mark for the redesigned marketing site.)
 *
 * @param {object} props
 * @param {number} [props.height=32] Pixel height of the icon tile; wordmark scales with it.
 * @param {'light'|'dark'} [props.variant='light'] 'light' for use on white backgrounds
 *   (dark "Construct" text), 'dark' for use on dark backgrounds (white "Construct" text).
 * @param {boolean} [props.iconOnly=false] Render just the icon tile, no wordmark.
 */
function BrandMark({ height = 32, variant = 'light', iconOnly = false }) {
  const constructColor = variant === 'dark' ? colors.white : colors.textPrimary;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, userSelect: 'none' }}>
      <Box
        sx={{
          width: height,
          height,
          flexShrink: 0,
          borderRadius: height * 0.28,
          bgcolor: colors.orange,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ArchitectureRoundedIcon sx={{ color: colors.white, fontSize: height * 0.6 }} />
      </Box>

      <Typography
        component="span"
        sx={{
          fontSize: height * 0.62,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-0.5px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          opacity: iconOnly ? 0 : 1,
          maxWidth: iconOnly ? 0 : 300,
          transition: 'opacity 0.2s ease, max-width 0.3s ease',
        }}
      >
        <Box component="span" sx={{ color: constructColor }}>
          Construct
        </Box>
        <Box component="span" sx={{ color: colors.orange }}>
          Est
        </Box>
      </Typography>
    </Box>
  );
}

export default BrandMark;

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { colors } from '../theme/palette';

// House and bars from the ConstructEst logo, traced from the full logo so it
// stays sharp at small sizes (sidebars, header, tab icon in public/favicon.svg).
function HouseMark({ size }) {
  return (
    <Box component="svg" viewBox="262 257 500 522" aria-hidden="true" sx={{ height: size, width: 'auto', flexShrink: 0, display: 'block' }}>
      <g fill={colors.orange}>
        <path d="M266 476 335 416V307h62v55l115-101 245 215v89L512 350 266 565Z" />
        <rect x="355" y="622" width="84" height="84" rx="6" />
        <rect x="469" y="569" width="85" height="137" rx="6" />
        <rect x="584" y="517" width="84" height="189" rx="6" />
        <rect x="322" y="733" width="380" height="42" rx="10" />
      </g>
    </Box>
  );
}

/**
 * ConstructEst brand mark: the house and bars from the logo and the
 * "ConstructEst" wordmark. Used by the sidebars, the public Navbar and Footer
 * and the sign in pages.
 *
 * @param {object} props
 * @param {number} [props.height=32] Pixel height of the icon tile; wordmark scales with it.
 * @param {'light'|'dark'} [props.variant='light'] 'light' for use on white backgrounds
 *   (dark "Construct" text), 'dark' for use on dark backgrounds (white "Construct" text).
 * @param {boolean} [props.iconOnly=false] Render just the mark, no wordmark.
 */
function BrandMark({ height = 32, variant = 'light', iconOnly = false }) {
  const constructColor = variant === 'dark' ? colors.white : colors.textPrimary;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, userSelect: 'none' }}>
      <HouseMark size={height} />

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

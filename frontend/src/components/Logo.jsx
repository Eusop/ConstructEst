import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { colors } from '../theme/palette';

/**
 * ConstructEst brand mark: a house-roof + growing bar-chart glyph
 * followed by the "ConstructEst" wordmark.
 *
 * Rendered as inline SVG + text so it scales crisply and needs no image asset.
 *
 * @param {object} props
 * @param {number} [props.height=52] Pixel height of the glyph; wordmark scales with it.
 */
function Logo({ height = 52 }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.25,
        userSelect: 'none',
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 64 56"
        sx={{ height, width: 'auto', flexShrink: 0 }}
        aria-hidden="true"
      >
        {/* Roof */}
        <path
          d="M6 27 L32 6 L58 27"
          fill="none"
          stroke={colors.orange}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Growing bars (estimate / analytics motif) */}
        <rect x="17" y="31" width="7" height="13" rx="1.5" fill={colors.orange} />
        <rect x="28.5" y="25" width="7" height="19" rx="1.5" fill={colors.orange} />
        <rect x="40" y="19" width="7" height="25" rx="1.5" fill={colors.orange} />
        {/* Base line */}
        <path
          d="M9 47 H55"
          stroke={colors.orange}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </Box>

      <Typography
        component="span"
        sx={{
          fontSize: height * 0.62,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-0.5px',
        }}
      >
        <Box component="span" sx={{ color: colors.brandBlueDark }}>
          Construct
        </Box>
        <Box component="span" sx={{ color: colors.brandBlueLight, fontStyle: 'italic' }}>
          Est
        </Box>
      </Typography>
    </Box>
  );
}

export default Logo;

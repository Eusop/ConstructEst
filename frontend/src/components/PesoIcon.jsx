import Box from '@mui/material/Box';

/**
 * Stand-in "icon" for currency figures — MUI's icon set has no ₱ glyph, so
 * this renders one styled to match the sizing/weight of the surrounding
 * outline icons.
 */
function PesoIcon({ sx, ...rest }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        lineHeight: 1,
        fontSize: 32,
        ...sx,
      }}
      {...rest}
    >
      ₱
    </Box>
  );
}

export default PesoIcon;

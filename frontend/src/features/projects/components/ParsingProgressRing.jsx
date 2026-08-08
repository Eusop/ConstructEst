import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { colors } from '../../../theme/palette';

const SIZE = 96;
const THICKNESS = 4;

/**
 * Overall parsing progress: a light grey track ring with a blue determinate
 * ring layered on top, and the percentage centered inside.
 *
 * @param {object} props
 * @param {number} props.value Progress percentage (0-100).
 */
function ParsingProgressRing({ value }) {
  return (
    <Box sx={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
      <CircularProgress
        variant="determinate"
        value={100}
        size={SIZE}
        thickness={THICKNESS}
        sx={{ color: 'grey.200', position: 'absolute', left: 0 }}
      />
      <CircularProgress
        variant="determinate"
        value={value}
        size={SIZE}
        thickness={THICKNESS}
        sx={{
          color: colors.accentBlue,
          position: 'absolute',
          left: 0,
          '& .MuiCircularProgress-circle': { strokeLinecap: 'round', transition: 'stroke-dashoffset 0.3s linear' },
        }}
      />
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: 'text.primary' }}>
          {Math.round(value)}%
        </Typography>
      </Box>
    </Box>
  );
}

export default ParsingProgressRing;

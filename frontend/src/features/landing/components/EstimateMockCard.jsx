import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import BrandMark from '../../../components/BrandMark';
import { colors } from '../../../theme/palette';

/**
 * Hero illustration: a mocked-up "estimate" screen (project name, budget
 * status, a floor-plan sketch, and the two headline stats) standing in for
 * a real product screenshot.
 */
function EstimateMockCard() {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 460,
        borderRadius: 4,
        p: 3,
        bgcolor: colors.ctaBackground,
        boxShadow: '0 20px 45px rgba(10, 14, 30, 0.25)',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <BrandMark height={28} variant="dark" iconOnly />
          <Typography sx={{ color: 'common.white', fontWeight: 700 }}>
            Villa Aurora · estimate
          </Typography>
        </Stack>

        <Box
          sx={{
            bgcolor: colors.iconGreenFg,
            color: 'common.white',
            fontSize: '0.75rem',
            fontWeight: 700,
            borderRadius: 999,
            px: 1.5,
            py: 0.5,
          }}
        >
          Within budget
        </Box>
      </Stack>

      <Box
        component="svg"
        viewBox="0 0 400 220"
        sx={{ width: '100%', height: 'auto', borderRadius: 2, bgcolor: '#0B0D14', mb: 2.5 }}
        role="img"
        aria-label="Floor plan sketch"
      >
        <rect x="30" y="30" width="220" height="90" fill="none" stroke={colors.brandBlueLight} strokeWidth="2" />
        <rect x="30" y="120" width="340" height="70" fill="none" stroke={colors.brandBlueLight} strokeWidth="2" />
        <line x1="290" y1="30" x2="290" y2="190" stroke={colors.orange} strokeWidth="2" />
      </Box>

      <Stack direction="row" spacing={2}>
        <Box sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 2, p: 2 }}>
          <Typography sx={{ color: 'grey.500', fontSize: '0.8rem', mb: 0.5 }}>
            Est. material cost
          </Typography>
          <Typography sx={{ color: 'common.white', fontWeight: 700, fontSize: '1.15rem' }}>
            ₱1,472,900
          </Typography>
        </Box>

        <Box sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 2, p: 2 }}>
          <Typography sx={{ color: 'grey.500', fontSize: '0.8rem', mb: 0.5 }}>
            Cheapest store
          </Typography>
          <Typography sx={{ color: 'common.white', fontWeight: 700, fontSize: '1.15rem' }}>
            Tarlac Depot · 1.2km
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export default EstimateMockCard;

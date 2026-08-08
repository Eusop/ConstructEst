import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import BrandMark from '../../../components/BrandMark';
import { colors } from '../../../theme/palette';

const HIGHLIGHTS = [
  { icon: DescriptionRoundedIcon, color: colors.accentBlue, label: 'Parse 2D AutoCAD floor plans' },
  { icon: TuneRoundedIcon, color: colors.iconOrangeFg, label: 'Optimize brands to your budget' },
  { icon: LocationOnRoundedIcon, color: colors.iconGreenFg, label: 'Compare nearby hardware stores' },
];

/**
 * Dark brand/marketing panel shown alongside the Sign In form: brand mark,
 * headline, quick capability highlights, and a footer tagline.
 */
function LoginBrandPanel() {
  return (
    <Box
      sx={{
        bgcolor: colors.ctaBackground,
        color: 'common.white',
        px: { xs: 4, md: 5 },
        py: { xs: 5, md: 6 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
      }}
    >
      <Box>
        <BrandMark height={32} variant="dark" />

        <Typography
          component="h1"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '1.5rem', md: '1.6rem' },
            lineHeight: 1.3,
            mt: { xs: 4, md: 6 },
            mb: 4,
          }}
        >
          Material estimates from your DXF, priced to the nearest store.
        </Typography>

        <Stack spacing={2.5}>
          {HIGHLIGHTS.map(({ icon: Icon, color, label }) => (
            <Stack key={label} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  flexShrink: 0,
                  borderRadius: 1.5,
                  bgcolor: color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon sx={{ color: 'common.white', fontSize: 18 }} />
              </Box>
              <Typography sx={{ fontSize: '0.95rem' }}>{label}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Typography sx={{ color: 'grey.500', fontSize: '0.75rem', mt: 5 }}>
        Rule-based structural material cost estimation &amp; optimization ·
        Philippine residential construction
      </Typography>
    </Box>
  );
}

export default LoginBrandPanel;

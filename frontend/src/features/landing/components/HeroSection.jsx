import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PesoIcon from '../../../components/PesoIcon';
import EstimateMockCard from './EstimateMockCard';
import { colors } from '../../../theme/palette';
import { ROUTES } from '../../../routes/paths';

const STATS = [
  { value: '1–2', label: 'storey homes' },
  { value: '8', label: 'material types' },
  { value: <PesoIcon sx={{ fontSize: { xs: '1.3rem', md: '1.5rem' } }} />, label: 'budget-aware' },
];

/**
 * Landing page hero: eyebrow badge, headline, supporting copy, primary
 * actions, quick stats, and the estimate mock-up illustration.
 */
function HeroSection() {
  return (
    <Box sx={{ bgcolor: colors.heroBackground, py: { xs: 5, md: 9 } }}>
      <Container maxWidth="lg">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 4, md: 8 }} alignItems="center">
          <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                bgcolor: colors.badgeBackground,
                color: colors.orange,
                fontSize: { xs: '0.75rem', md: '0.8rem' },
                fontWeight: 700,
                borderRadius: 999,
                px: 2,
                py: 0.75,
                mb: { xs: 2.5, md: 3 },
              }}
            >
              <HomeRoundedIcon sx={{ fontSize: 16 }} />
              For Philippine residential construction
            </Box>

            <Typography
              component="h1"
              sx={{
                fontWeight: 800,
                color: 'text.primary',
                lineHeight: 1.2,
                fontSize: { xs: '1.9rem', sm: '2.4rem', md: '2.6rem' },
                mb: { xs: 2, md: 2.5 },
              }}
            >
              {/* Mobile: the manual break below fought with the narrower
                  width's own natural wrapping, forcing the headline onto
                  three cramped lines instead of two balanced ones — letting
                  it wrap on its own reads better at phone width. sm+ keeps
                  the original two-line break exactly as before. Explicit
                  string literals (not bare JSX text) so the space between
                  the two halves survives regardless of which layout renders. */}
              {'Estimate materials straight '}
              <Box component="br" sx={{ display: { xs: 'none', sm: 'block' } }} />
              {'from your floor plan.'}
            </Typography>

            <Typography
              variant="body1"
              sx={{ color: 'text.secondary', maxWidth: 520, mx: { xs: 'auto', md: 0 }, mb: { xs: 3, md: 4 } }}
            >
              ConstructEst is a rule-based structural material cost estimation and
              optimization system. It reads your 2D AutoCAD DXF and applies validated
              engineering formulas to produce an itemized Bill of Materials, then
              optimizes brand choices to your budget and compares the nearest hardware
              stores by price and distance.
            </Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent={{ xs: 'center', md: 'flex-start' }}
              sx={{ mb: { xs: 3.5, md: 5 } }}
            >
              <Button
                component={RouterLink}
                to={ROUTES.SIGNUP}
                variant="contained"
                disableElevation
                startIcon={<UploadFileRoundedIcon />}
                sx={{
                  bgcolor: colors.accentBlue,
                  '&:hover': { bgcolor: colors.accentBlueDark },
                }}
              >
                Upload a DXF
              </Button>
              <Button
                component="a"
                href="#how-it-works"
                variant="outlined"
                sx={{
                  color: 'text.primary',
                  borderColor: 'grey.300',
                  bgcolor: 'common.white',
                  '&:hover': { borderColor: 'grey.400', bgcolor: 'common.white' },
                }}
                endIcon={<ArrowForwardRoundedIcon />}
              >
                See how it works
              </Button>
            </Stack>

            <Stack
              direction="row"
              spacing={{ xs: 3, md: 4 }}
              justifyContent={{ xs: 'center', md: 'flex-start' }}
            >
              {STATS.map((stat) => (
                <Box key={stat.label}>
                  <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.2rem', md: '1.4rem' }, color: 'text.primary' }}>
                    {stat.value}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.75rem', md: '0.85rem' } }}>
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', width: '100%' }}>
            <EstimateMockCard />
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

export default HeroSection;

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import { colors } from '../../../theme/palette';

const STEPS = [
  { icon: UploadFileRoundedIcon, color: colors.accentBlue, title: 'Upload DXF', subtitle: 'Set storeys & budget' },
  { icon: CalculateRoundedIcon, color: colors.iconGreenFg, title: 'Estimate', subtitle: 'Rule-based take-off' },
  { icon: TuneRoundedIcon, color: colors.iconOrangeFg, title: 'Optimize', subtitle: 'Cheapest per store' },
  { icon: MapRoundedIcon, color: colors.iconTealFg, title: 'Compare stores', subtitle: 'Cost & distance' },
  { icon: FileDownloadRoundedIcon, color: colors.iconPurpleFg, title: 'Download BOM', subtitle: 'Share as PDF' },
];

/**
 * "How it works" — the five-step upload-to-download flow.
 */
function HowItWorksSection() {
  return (
    <Box id="how-it-works" sx={{ bgcolor: colors.heroBackground, py: { xs: 5, md: 10 } }}>
      <Container maxWidth="lg">
        <Typography component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.9rem' }, color: 'text.primary', textAlign: 'center', mb: { xs: 4, md: 6 } }}>
          How it works
        </Typography>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 2.5, md: 5 }}
          sx={{ alignItems: { xs: 'stretch', md: 'flex-start' }, position: 'relative' }}
        >
          {/* Mobile only: a connecting line down the icon column turns the
              stacked rows into a real step-by-step flow instead of five
              unrelated list items — desktop's side-by-side row already
              reads as a sequence on its own and doesn't need one. */}
          <Box
            sx={{
              display: { xs: 'block', md: 'none' },
              position: 'absolute',
              left: 23,
              top: 24,
              bottom: 24,
              width: 2,
              bgcolor: 'divider',
              zIndex: 0,
            }}
          />

          {STEPS.map((step) => (
            <Stack
              key={step.title}
              direction={{ xs: 'row', md: 'column' }}
              spacing={{ xs: 2, md: 0 }}
              sx={{ alignItems: 'center', flex: 1, position: 'relative', zIndex: 1 }}
            >
              <Box
                sx={{
                  width: { xs: 48, md: 56 },
                  height: { xs: 48, md: 56 },
                  flexShrink: 0,
                  borderRadius: '50%',
                  bgcolor: step.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <step.icon sx={{ color: 'common.white', fontSize: { xs: 22, md: 26 } }} />
              </Box>

              <Box sx={{ textAlign: { xs: 'left', md: 'center' }, mt: { xs: 0, md: 2 } }}>
                <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: { xs: '0.92rem', md: '1rem' } }}>{step.title}</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.78rem', md: '0.85rem' } }}>{step.subtitle}</Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}

export default HowItWorksSection;

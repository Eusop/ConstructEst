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
    <Box id="how-it-works" sx={{ bgcolor: colors.heroBackground, py: { xs: 7, md: 10 } }}>
      <Container maxWidth="lg">
        <Typography component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', md: '1.9rem' }, color: 'text.primary', textAlign: 'center', mb: 6 }}>
          How it works
        </Typography>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 4, md: 5 }}
          sx={{ alignItems: { xs: 'stretch', md: 'flex-start' } }}
        >
          {STEPS.map((step) => (
            <Stack
              key={step.title}
              direction={{ xs: 'row', md: 'column' }}
              spacing={{ xs: 2, md: 0 }}
              sx={{ alignItems: 'center', flex: 1 }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  flexShrink: 0,
                  borderRadius: '50%',
                  bgcolor: step.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <step.icon sx={{ color: 'common.white', fontSize: 26 }} />
              </Box>

              <Box sx={{ textAlign: { xs: 'left', md: 'center' }, mt: { xs: 0, md: 2 } }}>
                <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{step.title}</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{step.subtitle}</Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}

export default HowItWorksSection;

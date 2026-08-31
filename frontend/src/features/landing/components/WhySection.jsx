import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import FeatureCard from './FeatureCard';
import { colors } from '../../../theme/palette';

const REASONS = [
  {
    icon: SpeedRoundedIcon,
    iconBg: colors.iconBlueBg,
    iconFg: colors.iconBlueFg,
    title: 'Faster take-offs',
    description: 'Turn a floor plan into a full BOM in minutes instead of hours.',
  },
  {
    icon: VerifiedRoundedIcon,
    iconBg: colors.iconGreenBg,
    iconFg: colors.iconGreenFg,
    title: 'Consistent results',
    description: 'The same validated formulas apply to every project, every time.',
  },
  {
    icon: SavingsRoundedIcon,
    iconBg: colors.iconOrangeBg,
    iconFg: colors.iconOrangeFg,
    title: 'Smarter spending',
    description: 'Stay within budget and buy from the most cost-effective store.',
  },
];

/**
 * "Why ConstructEst" — three supporting value-proposition cards.
 */
function WhySection() {
  return (
    <Box sx={{ bgcolor: 'common.white', py: { xs: 5, md: 10 } }}>
      <Container maxWidth="lg">
        <Typography component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.9rem' }, color: 'text.primary', textAlign: 'center', mb: 1.5 }}>
          Why ConstructEst
        </Typography>
        <Typography sx={{ color: 'text.secondary', textAlign: 'center', fontSize: { xs: '0.88rem', md: '1rem' }, mb: { xs: 3.5, md: 6 } }}>
          Faster, more consistent estimates for residential builds.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' },
            gap: { xs: 2, md: 3 },
          }}
        >
          {REASONS.map((reason) => (
            <FeatureCard key={reason.title} {...reason} bordered={false} />
          ))}
        </Box>
      </Container>
    </Box>
  );
}

export default WhySection;

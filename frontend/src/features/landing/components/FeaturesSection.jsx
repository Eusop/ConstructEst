import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import SquareFootRoundedIcon from '@mui/icons-material/SquareFootRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import PriceCheckRoundedIcon from '@mui/icons-material/PriceCheckRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import FeatureCard from './FeatureCard';
import { colors } from '../../../theme/palette';

const FEATURES = [
  {
    icon: SquareFootRoundedIcon,
    iconBg: colors.iconBlueBg,
    iconFg: colors.iconBlueFg,
    title: 'DXF floor-plan parsing',
    description: 'Reads wall lengths, floor areas, and roofing from standard CAD layers.',
  },
  {
    icon: CalculateRoundedIcon,
    iconBg: colors.iconGreenBg,
    iconFg: colors.iconGreenFg,
    title: 'Rule-based estimation',
    description: 'Validated engineering formulas turn measurements into an itemized BOM.',
  },
  {
    icon: ApartmentRoundedIcon,
    iconBg: colors.iconTealBg,
    iconFg: colors.iconTealFg,
    title: 'Roofing & multi-storey',
    description: 'Supports one- and two-storey homes, including roofing take-off.',
  },
  {
    icon: PriceCheckRoundedIcon,
    iconBg: colors.iconOrangeBg,
    iconFg: colors.iconOrangeFg,
    title: 'Per-store optimization',
    description: 'Finds the cheapest in-stock brand mix that fits your budget ceiling.',
  },
  {
    icon: LocationOnRoundedIcon,
    iconBg: colors.iconPurpleBg,
    iconFg: colors.iconPurpleFg,
    title: 'Store locator',
    description: 'Compares nearby stores by total cost and distance with Google Maps.',
  },
  {
    icon: PictureAsPdfRoundedIcon,
    iconBg: colors.iconBlueBg,
    iconFg: colors.iconBlueFg,
    title: 'PDF Bill of Materials',
    description: 'Download a shareable report, or send the completed estimate onward.',
  },
];

/**
 * "Everything from plan to procurement" — the six core capability cards.
 */
function FeaturesSection() {
  return (
    <Box id="features" sx={{ bgcolor: 'common.white', py: { xs: 7, md: 10 } }}>
      <Container maxWidth="lg">
        <Typography component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', md: '1.9rem' }, color: 'text.primary', textAlign: 'center', mb: 1.5 }}>
          Everything from plan to procurement
        </Typography>
        <Typography sx={{ color: 'text.secondary', textAlign: 'center', mb: 6 }}>
          Materials-only estimation for residential builds — no labor, permits, or taxes.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
            gap: 3,
          }}
        >
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </Box>
      </Container>
    </Box>
  );
}

export default FeaturesSection;

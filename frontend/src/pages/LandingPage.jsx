import Box from '@mui/material/Box';
import Navbar from '../layouts/Navbar';
import Footer from '../layouts/Footer';
import HeroSection from '../features/landing/components/HeroSection';
import FeaturesSection from '../features/landing/components/FeaturesSection';
import HowItWorksSection from '../features/landing/components/HowItWorksSection';
import WhySection from '../features/landing/components/WhySection';

function LandingPage() {
  return (
    <Box>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <WhySection />
      <Footer />
    </Box>
  );
}

export default LandingPage;

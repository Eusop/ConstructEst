import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import BrandMark from '../components/BrandMark';
import { colors } from '../theme/palette';
import { ROUTES } from '../routes/paths';

/**
 * Public marketing-site footer: brand mark + tagline, and a final
 * "Create free account" call to action.
 */
function Footer() {
  return (
    <Box component="footer" sx={{ bgcolor: colors.ctaBackground }}>
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2, sm: 3 }}
          sx={{ alignItems: 'center', justifyContent: 'space-between', py: { xs: 3, sm: 3 } }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 0.75, sm: 2 }}
            sx={{ alignItems: 'center', textAlign: { xs: 'center', sm: 'left' } }}
          >
            <BrandMark height={32} variant="dark" />
            <Typography sx={{ color: 'grey.500', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
              Rule-based structural material cost estimation &amp; optimization
            </Typography>
          </Stack>

          <Button
            component={RouterLink}
            to={ROUTES.SIGNUP}
            variant="contained"
            disableElevation
            endIcon={<ArrowForwardRoundedIcon />}
            sx={{
              bgcolor: 'common.white',
              color: 'text.primary',
              width: { xs: '100%', sm: 'auto' },
              '&:hover': { bgcolor: 'grey.100' },
            }}
          >
            Create free account
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}

export default Footer;

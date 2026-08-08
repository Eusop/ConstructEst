import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import BrandMark from '../../../components/BrandMark';
import { colors } from '../../../theme/palette';
import { ROUTES } from '../../../routes/paths';

/**
 * Dark brand/marketing panel shown alongside the Sign Up form: brand mark,
 * headline, supporting copy, a privacy highlight, and a footer sign-in
 * prompt.
 */
function SignUpBrandPanel() {
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
            mb: 2,
          }}
        >
          Create your account in a minute.
        </Typography>

        <Typography sx={{ color: 'grey.400', fontSize: '0.95rem', lineHeight: 1.6, mb: 4 }}>
          Upload plans, build estimates, optimize costs, compare stores, and
          share results — all from a single account.
        </Typography>

        <Box sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 2, p: 2.5 }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 0.75 }}>
            <ShieldRoundedIcon sx={{ color: colors.iconGreenFg, fontSize: 20 }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
              Your data stays private
            </Typography>
          </Stack>
          <Typography sx={{ color: 'grey.500', fontSize: '0.82rem', lineHeight: 1.5 }}>
            Estimates are only visible to you and the people you choose to
            share them with.
          </Typography>
        </Box>
      </Box>

      <Typography sx={{ fontSize: '0.9rem', mt: 5 }}>
        Already registered?{' '}
        <Link
          component={RouterLink}
          to={ROUTES.LOGIN}
          underline="none"
          sx={{ color: 'common.white', fontWeight: 700 }}
        >
          Sign in
        </Link>
      </Typography>
    </Box>
  );
}

export default SignUpBrandPanel;

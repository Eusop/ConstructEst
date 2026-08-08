import { Link as RouterLink } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Link from '@mui/material/Link';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import BrandMark from '../components/BrandMark';
import { colors } from '../theme/palette';
import { ROUTES } from '../routes/paths';

// "About" doesn't have a section yet — placeholder until one exists.
const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'About', href: '#' },
];

/**
 * Public marketing-site navigation bar: brand mark, section anchor links,
 * and the Sign in / Get started actions.
 */
function Navbar() {
  return (
    <AppBar
      position="static"
      color="inherit"
      elevation={0}
      sx={{ bgcolor: 'common.white', borderBottom: '1px solid', borderColor: 'divider' }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between', flexWrap: 'wrap', py: 1.5, gap: 2 }}>
          <BrandMark height={30} />

          <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center' }}>
            <Stack direction="row" spacing={4} sx={{ display: { xs: 'none', md: 'flex' } }}>
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  underline="none"
                  sx={{ fontSize: '0.95rem', fontWeight: 400, color: colors.navMuted }}
                >
                  {link.label}
                </Link>
              ))}
            </Stack>

            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
            <Link
              component={RouterLink}
              to={ROUTES.LOGIN}
              underline="none"
              sx={{
                display: 'flex',
                alignItems: 'center',
                lineHeight: 1,
                fontWeight: 600,
                color: 'text.primary',
                fontSize: '0.95rem',
              }}
            >
              Sign in
            </Link>
            <Button
              component={RouterLink}
              to={ROUTES.SIGNUP}
              variant="contained"
              disableElevation
              sx={{
                bgcolor: colors.accentBlue,
                '&:hover': { bgcolor: colors.accentBlueDark },
              }}
            >
              Get started
            </Button>
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Navbar;

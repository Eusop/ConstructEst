import { Link as RouterLink } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Link from '@mui/material/Link';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import BrandMark from '../components/BrandMark';
import { colors } from '../theme/palette';
import { ROUTES } from '../routes/paths';

/**
 * Site navigation bar (Terms/Privacy): brand mark and the Sign in / Get
 * started actions.
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

          <Stack direction="row" spacing={{ xs: 1, sm: 2.5 }} sx={{ alignItems: 'center' }}>
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
            {/* A text CTA, not a filled button: no box/background,
                brand-blue bold text with a small arrow that nudges forward
                and an underline that appears on hover/focus so it still
                unmistakably reads as clickable. A generous min width/height
                keeps the tap target accessible on mobile even though
                nothing is visually "boxed". */}
            <Button
              component={RouterLink}
              to={ROUTES.SIGNUP}
              disableElevation
              disableRipple
              endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 18, transition: 'transform 0.2s ease' }} />}
              sx={{
                bgcolor: 'transparent',
                boxShadow: 'none',
                color: colors.accentBlue,
                fontWeight: 700,
                fontSize: '0.95rem',
                textTransform: 'none',
                textDecoration: 'none',
                px: 1,
                minWidth: 44,
                minHeight: 44,
                borderRadius: 1,
                transition: 'color 0.2s ease',
                '&:hover': {
                  bgcolor: 'transparent',
                  boxShadow: 'none',
                  color: colors.accentBlueDark,
                  textDecoration: 'underline',
                  textUnderlineOffset: '4px',
                },
                '&:hover .MuiButton-endIcon': { transform: 'translateX(3px)' },
                '&:focus-visible': {
                  outline: `2px solid ${colors.accentBlue}`,
                  outlineOffset: 2,
                },
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

import { Component } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import { ROUTES } from '../routes/paths';
import { colors } from '../theme/palette';

/**
 * Last-resort safety net for the whole app: if any component throws during
 * render (e.g. a data/lookup mismatch like a missing icon for an activity
 * type), React unmounts everything below the nearest boundary, which
 * without one meant a blank white screen with no way back. This catches
 * that, shows a recoverable screen instead, and offers a hard navigation
 * (full reload) back to the Dashboard or the same page — safe here since
 * all app state is in-memory Context, so a reload simply resets it rather
 * than risking navigating with a corrupted tree.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Unhandled render error caught by ErrorBoundary:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: colors.heroBackground,
          px: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            bgcolor: 'common.white',
            boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
            py: 6,
            px: 4,
            textAlign: 'center',
            maxWidth: 440,
          }}
        >
          <Stack spacing={2} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: colors.iconRedBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ErrorOutlineRoundedIcon sx={{ color: colors.iconRedFg, fontSize: 26 }} />
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: 'text.primary' }}>
                Something went wrong
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', mt: 0.5 }}>
                An unexpected error occurred while rendering this page. You can reload it or head back to
                the Dashboard.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: '100%', justifyContent: 'center' }}>
              <Button
                onClick={() => window.location.reload()}
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                sx={{
                  color: 'text.primary',
                  borderColor: 'grey.300',
                  '&:hover': { borderColor: 'grey.400', bgcolor: 'grey.50' },
                }}
              >
                Reload page
              </Button>
              <Button
                onClick={() => window.location.assign(ROUTES.DASHBOARD)}
                variant="contained"
                disableElevation
                startIcon={<GridViewRoundedIcon />}
                sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
              >
                Go to Dashboard
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    );
  }
}

export default ErrorBoundary;

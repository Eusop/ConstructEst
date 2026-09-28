import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import BrandMark from '../../../components/BrandMark';
import LoginBrandPanel from './LoginBrandPanel';
import LoginForm from './LoginForm';

/**
 * Sign In card. Desktop (`md`+): two panels, a dark brand panel on the left and
 * the form on the right, in a shadowed rounded card. Below `md`: no floating
 * card (no shadow or radius), so the form sits edge to edge like a native app,
 * and the marketing panel is replaced by a compact brand mark so the form shows
 * without scrolling.
 */
function LoginCard() {
  return (
    <Paper
      elevation={0}
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', md: 960 },
        borderRadius: { xs: 0, md: 4 },
        boxShadow: { xs: 'none', md: (theme) => theme.shadows[6] },
        overflow: 'hidden',
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }}>
        <Box
          sx={{
            display: { xs: 'none', md: 'block' },
            width: '46%',
            overflow: 'hidden',
            borderTopLeftRadius: 4,
            borderBottomLeftRadius: 4,
          }}
        >
          <LoginBrandPanel />
        </Box>

        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.25, px: 3, pt: 4 }}>
          <BrandMark height={28} variant="light" />
        </Box>

        <Box
          sx={{
            width: { xs: '100%', md: '54%' },
            bgcolor: 'common.white',
            px: { xs: 3, md: 5 },
            py: { xs: 3, md: 6 },
            overflow: 'hidden',
            borderTopRightRadius: { md: 4 },
            borderBottomRightRadius: { md: 4 },
          }}
        >
          <LoginForm />
        </Box>
      </Stack>
    </Paper>
  );
}

export default LoginCard;

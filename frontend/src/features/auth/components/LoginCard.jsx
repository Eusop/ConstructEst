import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import LoginBrandPanel from './LoginBrandPanel';
import LoginForm from './LoginForm';

/**
 * Two-panel Sign In card: a dark brand/marketing panel on the left and the
 * sign-in form on the right.
 */
function LoginCard() {
  return (
    <Paper
      elevation={6}
      sx={{
        width: '100%',
        maxWidth: 960,
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }}>
        <Box
          sx={{
            width: { xs: '100%', md: '46%' },
            overflow: 'hidden',
            borderTopLeftRadius: 4,
            borderTopRightRadius: { xs: 4, md: 0 },
            borderBottomLeftRadius: { xs: 0, md: 4 },
            borderBottomRightRadius: 0,
          }}
        >
          <LoginBrandPanel />
        </Box>

        <Box
          sx={{
            width: { xs: '100%', md: '54%' },
            bgcolor: 'common.white',
            px: { xs: 4, md: 5 },
            py: { xs: 5, md: 6 },
            overflow: 'hidden',
            borderTopLeftRadius: 0,
            borderTopRightRadius: { xs: 0, md: 4 },
            borderBottomRightRadius: 4,
            borderBottomLeftRadius: { xs: 4, md: 0 },
          }}
        >
          <LoginForm />
        </Box>
      </Stack>
    </Paper>
  );
}

export default LoginCard;

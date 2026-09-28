import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import BrandMark from '../../../components/BrandMark';
import SignUpBrandPanel from './SignUpBrandPanel';
import SignUpForm from './SignUpForm';

/**
 * Sign Up card. Same structure and breakpoints as LoginCard so both auth pages
 * match: two panels on desktop (`md`+), and below `md` no floating card and a
 * compact brand mark instead of the marketing panel.
 */
function SignUpCard() {
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
          <SignUpBrandPanel />
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
          <SignUpForm />
        </Box>
      </Stack>
    </Paper>
  );
}

export default SignUpCard;

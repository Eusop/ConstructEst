import Box from '@mui/material/Box';
import AuthBackground from '../components/AuthBackground';
import ResetPasswordCard from '../features/auth/components/ResetPasswordCard';

function ResetPasswordPage() {
  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: { xs: 'stretch', md: 'center' },
        justifyContent: 'center',
        py: { xs: 0, md: 6 },
        px: { xs: 0, md: 2 },
        bgcolor: { xs: 'common.white', md: 'transparent' },
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <AuthBackground />
      </Box>

      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <ResetPasswordCard />
      </Box>
    </Box>
  );
}

export default ResetPasswordPage;

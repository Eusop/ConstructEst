import Box from '@mui/material/Box';
import AuthBackground from '../components/AuthBackground';
import SignUpCard from '../features/auth/components/SignUpCard';

function SignUpPage() {
  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 4, sm: 6 },
        px: 2,
        overflow: 'hidden',
      }}
    >
      <AuthBackground />

      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <SignUpCard />
      </Box>
    </Box>
  );
}

export default SignUpPage;

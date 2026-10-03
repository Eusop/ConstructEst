import { Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import AuthBackground from '../components/AuthBackground';
import ResetPasswordCard from '../features/auth/components/ResetPasswordCard';
import SetNewPasswordForm from '../features/auth/components/SetNewPasswordForm';
import { useUser } from '../context/UserContext';
import { ROUTES, ADMIN_ROUTES } from '../routes/paths';

/** After signing in with an admin's temporary password. Same shell as Reset Password. */
function SetNewPasswordPage() {
  const { isAuthenticated, isLoading, mustChangePassword, accessRole } = useUser();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  // Nothing to change: go to the app.
  if (!mustChangePassword) return <Navigate to={accessRole === 'admin' ? ADMIN_ROUTES.DASHBOARD : ROUTES.DASHBOARD} replace />;

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100dvh',
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
        <ResetPasswordCard>
          <SetNewPasswordForm />
        </ResetPasswordCard>
      </Box>
    </Box>
  );
}

export default SetNewPasswordPage;

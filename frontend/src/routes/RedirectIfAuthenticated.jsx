import { Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useUser } from '../context/UserContext';
import { ROUTES, ADMIN_ROUTES } from './paths';

/**
 * The reverse of RequireRole, for Login and Sign up: a signed-in user (for
 * example a restored "keep me signed in" session) is sent to their dashboard
 * instead of seeing the login form. While a stored token is being checked it
 * shows a spinner so the form does not flash.
 */
function RedirectIfAuthenticated({ children }) {
  const { isAuthenticated, isLoading, accessRole } = useUser();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={accessRole === 'admin' ? ADMIN_ROUTES.DASHBOARD : ROUTES.DASHBOARD} replace />;
  }

  return children;
}

export default RedirectIfAuthenticated;

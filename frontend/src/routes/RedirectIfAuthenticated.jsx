import { Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useUser } from '../context/UserContext';
import { ROUTES, ADMIN_ROUTES } from './paths';

/**
 * The reverse of RequireRole, for Login and Sign up: someone who is already
 * signed in (a kept session restored from localStorage) gets sent to their
 * own dashboard instead of being shown the login form again. Without this,
 * reopening the site's link in a new tab showed the login page even though
 * the session was fine, which looked like "Keep me signed in" not working.
 * While a stored token is still being checked the page shows a spinner, so
 * the login form doesn't flash before the redirect.
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

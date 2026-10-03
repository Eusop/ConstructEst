import { Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useUser } from '../context/UserContext';
import { ROUTES } from './paths';

/**
 * Limits a layout route to one `accessRole` (see UserContext). Not signed in
 * goes to Login. Wrong role goes to `redirectTo` (that module's dashboard), so
 * an admin never sees User Module pages and vice versa.
 */
function RequireRole({ role, redirectTo, children }) {
  const { isAuthenticated, isLoading, accessRole, mustChangePassword } = useUser();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  // Signed in with an admin's temporary password: set a new one first.
  if (mustChangePassword) return <Navigate to={ROUTES.SET_NEW_PASSWORD} replace />;
  if (accessRole !== role) return <Navigate to={redirectTo} replace />;

  return children;
}

export default RequireRole;

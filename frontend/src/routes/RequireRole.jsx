import { Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useUser } from '../context/UserContext';
import { ROUTES } from './paths';

/**
 * Gates a layout route behind a specific `accessRole` (see UserContext).
 * Not authenticated -> Login. Authenticated but wrong role -> `redirectTo`
 * (each module's own dashboard), so an admin login can never end up
 * rendering User Module pages and vice versa.
 */
function RequireRole({ role, redirectTo, children }) {
  const { isAuthenticated, isLoading, accessRole } = useUser();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  if (accessRole !== role) return <Navigate to={redirectTo} replace />;

  return children;
}

export default RequireRole;

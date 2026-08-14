import { Outlet, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { useToggle } from '../../hooks/useToggle';
import { colors } from '../../theme/palette';
import { ADMIN_ROUTES } from '../../routes/paths';

const PAGE_TITLES = {
  [ADMIN_ROUTES.DASHBOARD]: 'Dashboard',
  [ADMIN_ROUTES.USERS]: 'User Management',
  [ADMIN_ROUTES.STORES]: 'Hardware Stores',
  [ADMIN_ROUTES.MATERIALS]: 'Materials & Brands',
  [ADMIN_ROUTES.SETTINGS]: 'Estimation Settings',
  [ADMIN_ROUTES.PROFILE]: 'Profile',
};

/**
 * Shell for Admin Module pages — the same layout structure as the User
 * Module's DashboardLayout (persistent Sidebar open/closed state, header,
 * <Outlet /> below it) but with the Admin-only Sidebar/Header, and none of
 * the User Module's project-flow providers mounted.
 */
function AdminLayout() {
  const theme = useTheme();
  const location = useLocation();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [sidebarOpen, toggleSidebar, setSidebarOpen] = useToggle(isDesktop);

  const title = PAGE_TITLES[location.pathname] ?? 'Dashboard';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: colors.heroBackground }}>
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AdminHeader onToggleSidebar={toggleSidebar} title={title} />
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default AdminLayout;

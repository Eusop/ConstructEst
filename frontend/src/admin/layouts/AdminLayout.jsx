import { Outlet, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import NoPageScrollbarGutter from '../../components/NoPageScrollbarGutter';
import { useToggle } from '../../hooks/useToggle';
import { colors } from '../../theme/palette';
import { ADMIN_ROUTES } from '../../routes/paths';

const PAGE_TITLES = {
  [ADMIN_ROUTES.DASHBOARD]: 'Dashboard',
  [ADMIN_ROUTES.USERS]: 'User Management',
  [ADMIN_ROUTES.STORES]: 'Hardware Stores',
  [ADMIN_ROUTES.MATERIALS]: 'Materials & Brands',
  [ADMIN_ROUTES.ACTIVITY_LOG]: 'Activity Log',
  [ADMIN_ROUTES.SETTINGS]: 'Estimation Settings',
  [ADMIN_ROUTES.PROFILE]: 'Profile',
};

/**
 * Shell for Admin Module pages: same structure as the User Module's
 * DashboardLayout (sidebar state, header, <Outlet />) with the admin Sidebar and
 * Header, and none of the project-flow providers.
 */
function AdminLayout() {
  const theme = useTheme();
  const location = useLocation();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [sidebarOpen, toggleSidebar, setSidebarOpen] = useToggle(isDesktop);

  const title = PAGE_TITLES[location.pathname] ?? 'Dashboard';

  return (
    // `height` (not minHeight) makes this a fixed-viewport shell. AdminSidebar
    // assumes one (its desktop Box is `height: '100vh', position: sticky`).
    // Without a hard ceiling the page grows past the viewport, and inner
    // `flex: 1, minHeight: 0, overflow: 'auto'` panels (e.g. "Registered stores")
    // never get a bounded height, so the whole page scrolls instead.
    <Box sx={{ display: 'flex', height: '100dvh', overflow: 'hidden', bgcolor: colors.heroBackground }}>
      <NoPageScrollbarGutter />
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AdminHeader onToggleSidebar={toggleSidebar} title={title} />
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            p: { xs: 2, md: 3 },
            // Safety net now that the shell is a hard `overflow: hidden` viewport
            // height. Pages with their own scroll region still scroll there, but a
            // page without one would have content clipped and unreachable.
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default AdminLayout;

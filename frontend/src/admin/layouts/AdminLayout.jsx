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
    // height (not minHeight) is what actually makes this a fixed-viewport
    // shell — AdminSidebar already assumes one (its own desktop Box is
    // `height: '100vh', position: sticky`). Without a hard ceiling here,
    // the whole page grows past the viewport whenever a page's content
    // needs more room, and every `flex: 1, minHeight: 0, overflow: 'auto'`
    // panel further down (e.g. AdminStoresPage's "Registered stores" list)
    // never actually gets a bounded height to scroll *within* — the
    // browser just scrolls the whole page instead of that one panel.
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: colors.heroBackground }}>
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
            // Safety net now that the shell above is a hard `overflow:
            // hidden` viewport height: a page that scrolls internally
            // (like AdminStoresPage's own flex/minHeight:0/overflow:auto
            // panel) still does, since that panel gets a real bounded
            // height to work with now — but any admin page that *doesn't*
            // set up its own internal scroll region would otherwise have
            // extra content silently clipped and unreachable instead of
            // just scrolling, which is a worse outcome than before.
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

import { Outlet, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Sidebar from './Sidebar';
import DashboardHeader from './DashboardHeader';
import SelectedStoreBadge from '../features/brandSelection/components/SelectedStoreBadge';
import { useToggle } from '../hooks/useToggle';
import { useProjects } from '../context/ProjectsContext';
import { STORES } from '../features/storeLocator/data/storesMock';
import { colors } from '../theme/palette';
import { ROUTES } from '../routes/paths';

// Header content per route: either a plain `title`, or `breadcrumbs` for
// nested pages (rendered as a trail with the last crumb bold/current).
// Add an entry here whenever a new page joins this layout.
const PAGE_HEADERS = {
  [ROUTES.DASHBOARD]: { title: 'Dashboard' },
  [ROUTES.PROJECTS]: { title: 'Projects' },
  [ROUTES.SETTINGS]: { title: 'Calibration' },
  [ROUTES.PROFILE]: { title: 'Profile' },
  [ROUTES.NOTIFICATIONS]: { title: 'Notifications' },
  [ROUTES.NEW_PROJECT]: {
    breadcrumbs: [
      { label: 'Projects', to: ROUTES.PROJECTS },
      { label: 'New project' },
    ],
  },
};

// Routes whose middle breadcrumb is the New project draft's name, resolved
// at render time instead of statically in PAGE_HEADERS above.
const DRAFT_NAME_BREADCRUMBS = {
  [ROUTES.PROJECT_PROCESSING]: (projectName) => [
    { label: 'Projects', to: ROUTES.PROJECTS },
    { label: projectName },
    { label: 'Processing' },
  ],
  [ROUTES.PROJECT_RESULTS]: (projectName) => [
    { label: 'Projects', to: ROUTES.PROJECTS },
    { label: projectName },
  ],
};

// Routes whose header is a static title plus the *active project's* name as
// a muted "· <name>" suffix (unlike the draft-name routes above, these
// operate on whichever project is active, not the in-progress New project
// draft).
const ACTIVE_PROJECT_SUBTITLES = {
  [ROUTES.MATERIAL_ESTIMATION]: (projectName) => ({ title: 'Material Estimation', subtitle: projectName }),
  [ROUTES.STORE_LOCATOR]: (projectName) => ({ title: 'Store Locator', subtitle: projectName }),
  [ROUTES.BRAND_SELECTION]: (projectName) => ({ title: 'Brand Selection', subtitle: projectName }),
  [ROUTES.BILL_OF_MATERIALS]: (projectName) => ({ title: 'Bill of Materials', subtitle: projectName }),
};

/**
 * Shell for authenticated app pages, mounted once as a React Router layout
 * route (see routes/AppRoutes.jsx) so the Sidebar's open/closed state and
 * the rest of the shell persist across navigation between child pages
 * instead of resetting on every route change. Child pages render into the
 * <Outlet /> below the header.
 *
 * The sidebar defaults open on desktop and closed on mobile/tablet, and can
 * be toggled from the header at any size. On desktop it's a normal flex
 * sibling, so content reflows automatically as it widens; below the `md`
 * breakpoint, Sidebar itself switches to a temporary overlay (see
 * layouts/Sidebar.jsx) that never reserves layout space, so `onClose` below
 * is only ever invoked there (backdrop click, Escape, or picking a nav item).
 */
function DashboardLayout() {
  const theme = useTheme();
  const location = useLocation();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [sidebarOpen, toggleSidebar, setSidebarOpen] = useToggle(isDesktop);
  const { draft, activeProject } = useProjects();

  const draftBreadcrumbs = DRAFT_NAME_BREADCRUMBS[location.pathname]?.(draft.projectName);
  const activeSubtitleHeader = ACTIVE_PROJECT_SUBTITLES[location.pathname]?.(activeProject?.projectName);
  const header =
    PAGE_HEADERS[location.pathname] ??
    (draftBreadcrumbs ? { breadcrumbs: draftBreadcrumbs } : null) ??
    activeSubtitleHeader ??
    PAGE_HEADERS[ROUTES.DASHBOARD];

  const selectedStore = STORES.find((store) => store.id === activeProject?.selectedStoreId);
  const headerBadge =
    location.pathname === ROUTES.BRAND_SELECTION && selectedStore ? (
      <SelectedStoreBadge storeName={selectedStore.name} />
    ) : null;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: colors.heroBackground }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <DashboardHeader
          onToggleSidebar={toggleSidebar}
          title={header.title}
          subtitle={header.subtitle}
          breadcrumbs={header.breadcrumbs}
          headerBadge={headerBadge}
        />
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default DashboardLayout;

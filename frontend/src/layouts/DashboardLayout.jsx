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
  [ROUTES.PROFILE]: { title: 'Profile' },
};

// New Project's header changes by screen size instead of a fixed entry
// above, mobile doesn't have room for the full breadcrumb next to the
// header icons, so it just shows a plain title below md.
const NEW_PROJECT_BREADCRUMBS = [
  { label: 'Projects', to: ROUTES.PROJECTS },
  { label: 'New project' },
];

// Breadcrumbs with the draft project's name in them, resolved at render
// time. Desktop only, same reasoning as above, no room on mobile.
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

// Mobile version of DRAFT_NAME_BREADCRUMBS, just a short title since the
// project name is already shown in the page body itself.
const MOBILE_DRAFT_TITLES = {
  [ROUTES.PROJECT_PROCESSING]: 'Processing',
  [ROUTES.PROJECT_RESULTS]: 'Results',
};

// Routes with a static title plus the active project's name as a subtitle,
// unlike the draft routes above these use the active project, not the draft.
const ACTIVE_PROJECT_SUBTITLES = {
  [ROUTES.MATERIAL_ESTIMATION]: (projectName) => ({ title: 'Material Estimation', subtitle: projectName }),
  [ROUTES.STORE_LOCATOR]: (projectName) => ({ title: 'Store Locator', subtitle: projectName }),
  [ROUTES.BRAND_SELECTION]: (projectName) => ({ title: 'Brand Selection', subtitle: projectName }),
  [ROUTES.BILL_OF_MATERIALS]: (projectName) => ({ title: 'Bill of Materials', subtitle: projectName }),
};

/**
 * Shell for authenticated pages, mounted once as a layout route so the
 * sidebar state persists across navigation. Pages render into <Outlet />.
 * Sidebar defaults open on desktop, closed on mobile.
 */
function DashboardLayout() {
  const theme = useTheme();
  const location = useLocation();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [sidebarOpen, toggleSidebar, setSidebarOpen] = useToggle(isDesktop);
  const { draft, activeProject } = useProjects();

  const newProjectHeader =
    location.pathname === ROUTES.NEW_PROJECT
      ? isDesktop
        ? { breadcrumbs: NEW_PROJECT_BREADCRUMBS }
        : { title: 'New Project' }
      : null;
  const draftBreadcrumbs = DRAFT_NAME_BREADCRUMBS[location.pathname]?.(draft.projectName);
  const draftMobileHeader =
    draftBreadcrumbs && !isDesktop ? { title: MOBILE_DRAFT_TITLES[location.pathname] } : null;
  const activeSubtitleHeader = ACTIVE_PROJECT_SUBTITLES[location.pathname]?.(activeProject?.projectName);
  const header =
    newProjectHeader ??
    PAGE_HEADERS[location.pathname] ??
    draftMobileHeader ??
    (draftBreadcrumbs ? { breadcrumbs: draftBreadcrumbs } : null) ??
    activeSubtitleHeader ??
    PAGE_HEADERS[ROUTES.DASHBOARD];

  const selectedStore = STORES.find((store) => store.id === activeProject?.selectedStoreId);
  const headerBadge =
    location.pathname === ROUTES.BRAND_SELECTION && selectedStore ? (
      <SelectedStoreBadge storeName={selectedStore.name} />
    ) : null;

  return (
    // height (not minHeight) is what makes this a fixed-viewport shell.
    // Without it the whole page could grow past the viewport instead of
    // letting an inner panel scroll on its own, same fix as AdminLayout.jsx.
    // 100dvh, not 100vh: on mobile browsers 100vh is the viewport with the
    // URL bar hidden, so a 100vh shell always hangs below the visible area
    // and its bottom edge (and this shell's bottom padding) ends up under
    // the toolbar — by a different amount on every device, which is what
    // made the same page look differently spaced across phone presets.
    // Identical to 100vh wherever there is no dynamic toolbar (desktop).
    <Box sx={{ display: 'flex', height: '100dvh', overflow: 'hidden', bgcolor: colors.heroBackground }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <DashboardHeader
          onToggleSidebar={toggleSidebar}
          title={header.title}
          subtitle={header.subtitle}
          breadcrumbs={header.breadcrumbs}
          headerBadge={headerBadge}
        />
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            p: { xs: 2, md: 3 },
            // Safety net so a page without its own scroll region doesn't
            // get its content silently clipped by the fixed-height shell.
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default DashboardLayout;

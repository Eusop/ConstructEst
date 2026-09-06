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
  [ROUTES.NOTIFICATIONS]: { title: 'Notifications' },
};

// New Project's header differs by size instead of being a fixed entry in
// PAGE_HEADERS above: desktop has the room for the full "Projects > New
// project" breadcrumb, but mobile/tablet don't — combined with the header's
// own Notifications/Profile icons there (see DashboardHeader), the trail
// crowded out "New Project" entirely. Below `md`, it's just the plain title,
// same treatment (and font size) as every other page's header.
const NEW_PROJECT_BREADCRUMBS = [
  { label: 'Projects', to: ROUTES.PROJECTS },
  { label: 'New project' },
];

// Routes whose middle breadcrumb is the New project draft's name, resolved
// at render time instead of statically in PAGE_HEADERS above. Desktop only
// (see MOBILE_DRAFT_TITLES below) — same reasoning as NEW_PROJECT_BREADCRUMBS:
// a 2-3 level trail with a real (possibly long) project name in it, next to
// the header's own Notifications/Profile icons, has no room to breathe on a
// phone.
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

// Mobile/tablet counterpart to DRAFT_NAME_BREADCRUMBS: a short, static
// title naming the *screen* (matching every other page's header) instead of
// the breadcrumb trail — the project itself is already front and center in
// each page's own body (ProjectSummaryCard / the floor plan preview), so the
// header doesn't need to repeat it too.
const MOBILE_DRAFT_TITLES = {
  [ROUTES.PROJECT_PROCESSING]: 'Processing',
  [ROUTES.PROJECT_RESULTS]: 'Results',
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
    // height (not minHeight) is what actually makes this a fixed-viewport
    // shell — Sidebar already assumes one (its own desktop Box is
    // `height: '100vh', position: sticky`, same as AdminSidebar). Without a
    // hard ceiling here, the whole page grows past the viewport whenever a
    // page's content needs more room, and any `flex: 1, minHeight: 0,
    // overflow: 'auto'` panel further down never actually gets a bounded
    // height to scroll *within* — the browser scrolls the whole page
    // instead of that one panel (see the identical fix in AdminLayout.jsx,
    // triggered by the Registered Stores list outgrowing its card there).
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: colors.heroBackground }}>
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
            // Safety net now that the shell above is a hard `overflow:
            // hidden` viewport height: a page with its own internal scroll
            // region still scrolls that region as intended, but a page
            // that doesn't set one up would otherwise have extra content
            // silently clipped and unreachable instead of just scrolling.
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

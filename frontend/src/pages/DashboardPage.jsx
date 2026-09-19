import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import WelcomeCard from '../features/dashboard/components/WelcomeCard';
import StatCard from '../features/dashboard/components/StatCard';
import ProjectStatsSection from '../features/dashboard/components/ProjectStatsSection';
import RecentActivity from '../features/dashboard/components/RecentActivity';
import { ACTIVITY_TYPES, DEFAULT_ACTIVITY_TYPE } from '../features/dashboard/data/activityTypes';
import { useDashboardActivity } from '../context/DashboardActivityContext';
import { useProjects } from '../context/ProjectsContext';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { ROUTES } from '../routes/paths';
import { colors } from '../theme/palette';

function DashboardPage() {
  // Tablet/desktop gets a real 2x2 grid (greeting as one of its 4 cells);
  // phones get the greeting as its own full-width card followed by a
  // swipeable carousel — genuinely different structures, not just a resize
  // of the same one, so this branches in JS rather than trying to force
  // one DOM tree to cover both with responsive CSS alone (same reasoning
  // as Sidebar's own isDesktop branch between a flex sidebar and a Drawer).
  // `noSsr` is safe/correct here: this app is a client-only SPA, so there's
  // no server-rendered markup to match on the first paint.
  const theme = useTheme();
  const isTabletUp = useMediaQuery(theme.breakpoints.up('sm'), { noSsr: true });

  const { totalProjects, estimationsDone, activities } = useDashboardActivity();
  const { projects } = useProjects();

  // Client-side only, from the same project list the Projects page already
  // loads — an "Estimated" project has a generated material take-off, the
  // closest existing status to "completed" until a real completed-projects
  // metric exists server-side.
  const completedProjects = projects.filter((project) => project.status === 'Estimated').length;

  const allProjectsStat = {
    label: 'All Projects',
    icon: Inventory2RoundedIcon,
    iconBg: colors.iconBlueBg,
    iconFg: colors.iconBlueFg,
    value: String(totalProjects),
    viewAllTo: ROUTES.PROJECTS,
  };
  const completedProjectsStat = {
    label: 'Completed Projects',
    icon: CheckCircleRoundedIcon,
    iconBg: colors.iconGreenBg,
    iconFg: colors.iconGreenFg,
    value: String(completedProjects),
    // No dedicated "completed only" view exists yet, so this points at
    // the same Projects list All Projects does — same "View All"
    // component/behavior as that card, just no filter applied server-side.
    viewAllTo: ROUTES.PROJECTS,
  };
  // UI-only rename (label/icon/color) — still reads `estimationsDone` off
  // the same dashboard summary until a real "draft projects" count exists
  // server-side.
  const draftProjectsStat = {
    label: 'Draft Projects',
    icon: EditNoteRoundedIcon,
    iconBg: colors.iconOrangeBg,
    iconFg: colors.iconOrangeFg,
    value: String(estimationsDone),
    // Same caveat as Completed Projects above: no "drafts only" filter
    // exists yet, so this is the same Projects list for now.
    viewAllTo: ROUTES.PROJECTS,
  };

  // The phone carousel's left-to-right swipe order — unchanged from before
  // this task, kept independent of the tablet/desktop grid's own order
  // below (the two layouts place these three differently on purpose).
  const carouselStats = [allProjectsStat, completedProjectsStat, draftProjectsStat];

  const displayActivities = activities.map((activity) => ({
    id: activity.id,
    message: activity.message,
    timestamp: formatRelativeTime(activity.timestamp),
    ...(ACTIVITY_TYPES[activity.type] ?? DEFAULT_ACTIVITY_TYPE),
  }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {isTabletUp ? (
        // Tablet/desktop: one 2x2 grid — greeting top-left, All Projects
        // top-right, Draft Projects bottom-left, Completed Projects
        // bottom-right.
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 2.5,
            mb: 2.5,
            flexShrink: 0,
          }}
        >
          <WelcomeCard />
          <StatCard {...allProjectsStat} />
          <StatCard {...draftProjectsStat} />
          <StatCard {...completedProjectsStat} />
        </Box>
      ) : (
        // Phones: unchanged — full-width greeting, then the swipeable
        // carousel (see ProjectStatsSection).
        <>
          <Box sx={{ mb: 2.5, flexShrink: 0 }}>
            <WelcomeCard />
          </Box>
          <Box sx={{ mb: 2.5, flexShrink: 0 }}>
            <ProjectStatsSection stats={carouselStats} />
          </Box>
        </>
      )}

      <RecentActivity activities={displayActivities} />
    </Box>
  );
}

export default DashboardPage;

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
import { isProjectComplete } from '../features/projects/utils/projectStatus';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { ROUTES } from '../routes/paths';
import { colors } from '../theme/palette';

function DashboardPage() {
  // Tablet/desktop uses a 2x2 grid (greeting is one cell). Phones use the
  // greeting card plus a swipeable carousel. They are different structures, so
  // this branches in JS (like Sidebar's isDesktop). `noSsr` is fine in this
  // client-only SPA.
  const theme = useTheme();
  const isTabletUp = useMediaQuery(theme.breakpoints.up('sm'), { noSsr: true });

  const { totalProjects, activities } = useDashboardActivity();
  const { projects } = useProjects();

  // Same rule as the Projects page tag (isProjectComplete): complete = brand
  // selection saved and BOM generated. Everything else is a draft.
  const completedProjects = projects.filter(isProjectComplete).length;
  const draftProjects = projects.length - completedProjects;

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
    // Opens the Projects page on the Complete tab.
    viewAllTo: `${ROUTES.PROJECTS}?status=complete`,
  };
  const draftProjectsStat = {
    label: 'Draft Projects',
    icon: EditNoteRoundedIcon,
    iconBg: colors.iconOrangeBg,
    iconFg: colors.iconOrangeFg,
    value: String(draftProjects),
    // Drafts are the Incomplete tab on the Projects page.
    viewAllTo: `${ROUTES.PROJECTS}?status=incomplete`,
  };

  // Phone carousel swipe order. Kept separate from the tablet/desktop grid order
  // below on purpose.
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
        // Tablet/desktop: one 2x2 grid (greeting top-left, All Projects top-right,
        // Draft bottom-left, Completed bottom-right).
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
        // Phones: full-width greeting, then the swipeable carousel (ProjectStatsSection).
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

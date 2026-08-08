import Box from '@mui/material/Box';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WelcomeBanner from '../features/dashboard/components/WelcomeBanner';
import StatCard from '../features/dashboard/components/StatCard';
import RecentActivity from '../features/dashboard/components/RecentActivity';
import { ACTIVITY_TYPES, DEFAULT_ACTIVITY_TYPE } from '../features/dashboard/data/activityTypes';
import { useDashboardActivity } from '../context/DashboardActivityContext';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { ROUTES } from '../routes/paths';
import { colors } from '../theme/palette';

function DashboardPage() {
  const { totalProjects, estimationsDone, activities } = useDashboardActivity();

  const stats = [
    {
      label: 'Total Projects',
      icon: Inventory2RoundedIcon,
      iconBg: colors.iconBlueBg,
      iconFg: colors.iconBlueFg,
      value: String(totalProjects),
      viewAllTo: ROUTES.PROJECTS,
    },
    { label: 'Estimations Done', icon: CheckCircleRoundedIcon, iconBg: colors.iconGreenBg, iconFg: colors.iconGreenFg, value: String(estimationsDone) },
  ];

  const displayActivities = activities.map((activity) => ({
    id: activity.id,
    message: activity.message,
    timestamp: formatRelativeTime(activity.timestamp),
    ...(ACTIVITY_TYPES[activity.type] ?? DEFAULT_ACTIVITY_TYPE),
  }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <WelcomeBanner />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          gap: 2.5,
          mt: 2.5,
          mb: 2.5,
          flexShrink: 0,
        }}
      >
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </Box>

      <RecentActivity activities={displayActivities} />
    </Box>
  );
}

export default DashboardPage;

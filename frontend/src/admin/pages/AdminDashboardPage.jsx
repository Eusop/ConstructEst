import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import AdminWelcomeCard from '../components/AdminWelcomeCard';
import StatCard from '../../features/dashboard/components/StatCard';
import ProjectStatsSection from '../../features/dashboard/components/ProjectStatsSection';
import RecentActivity from '../../features/dashboard/components/RecentActivity';
import { useAdminActivity } from '../context/AdminActivityContext';
import { useAdminStores } from '../context/AdminStoresContext';
import { listAdminUsers } from '../services/adminService';
import { formatRelativeTime } from '../../utils/formatRelativeTime';
import { ADMIN_ROUTES } from '../../routes/paths';
import { colors } from '../../theme/palette';

/**
 * Admin dashboard: desktop/tablet keeps its own unchanged 2x2 grid
 * (AdminWelcomeCard top-left, then the 3 stat cards filling the rest in DOM
 * order — Total Users top-right, Active Users bottom-left, Hardware Stores
 * bottom-right). Phones get the same mobile treatment as the User Module's
 * Dashboard instead (see pages/DashboardPage): AdminWelcomeCard full-width,
 * then the same 3 stat cards as a swipeable carousel (ProjectStatsSection,
 * shared and content-agnostic — just given Admin's own stats here) rather
 * than a cramped 2-per-row grid. Branches in JS rather than pure responsive
 * CSS because the two are genuinely different structures, same reasoning as
 * DashboardPage's own isTabletUp split.
 *
 * Every stat number here is either real (Total/Active Users, from GET
 * /api/admin/users) or admin-session data that starts at zero (Hardware
 * Stores — see AdminStoresContext) — nothing is seeded/fake, per the spec.
 * Recent activity is empty until the admin actually does something in
 * Users/Stores/Materials/Settings (see logActivity calls there).
 */
function AdminDashboardPage() {
  const theme = useTheme();
  const isTabletUp = useMediaQuery(theme.breakpoints.up('sm'), { noSsr: true });

  const { activities } = useAdminActivity();
  const { stores } = useAdminStores();
  const [userCounts, setUserCounts] = useState({ total: 0, active: 0 });

  useEffect(() => {
    let cancelled = false;
    listAdminUsers()
      .then(({ users }) => {
        if (cancelled) return;
        setUserCounts({ total: users.length, active: users.filter((user) => user.isActive).length });
      })
      .catch(() => {
        if (cancelled) return;
        setUserCounts({ total: 0, active: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [activities.length]);

  const totalUsersStat = {
    label: 'Total Users',
    icon: GroupRoundedIcon,
    iconBg: colors.iconBlueBg,
    iconFg: colors.iconBlueFg,
    value: String(userCounts.total),
    viewAllTo: ADMIN_ROUTES.USERS,
  };
  const activeUsersStat = {
    label: 'Active Users',
    icon: CheckCircleRoundedIcon,
    iconBg: colors.iconGreenBg,
    iconFg: colors.iconGreenFg,
    value: String(userCounts.active),
  };
  const hardwareStoresStat = {
    label: 'Hardware Stores',
    icon: StorefrontRoundedIcon,
    iconBg: colors.iconOrangeBg,
    iconFg: colors.iconOrangeFg,
    value: String(stores.length),
    viewAllTo: ADMIN_ROUTES.STORES,
  };

  const stats = [totalUsersStat, activeUsersStat, hardwareStoresStat];

  const displayActivities = activities.map((activity) => ({
    id: activity.id,
    message: activity.message,
    timestamp: formatRelativeTime(activity.timestamp),
    icon: activity.icon,
    iconBg: activity.iconBg,
    iconFg: activity.iconFg,
  }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {isTabletUp ? (
        // Tablet/desktop: unchanged 2x2 grid.
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 2.5,
            mb: 2.5,
            flexShrink: 0,
          }}
        >
          <AdminWelcomeCard />
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </Box>
      ) : (
        // Phones: full-width greeting, then the same swipeable carousel
        // treatment as the User Module's Dashboard (see ProjectStatsSection).
        <>
          <Box sx={{ mb: 2.5, flexShrink: 0 }}>
            <AdminWelcomeCard />
          </Box>
          <Box sx={{ mb: 2.5, flexShrink: 0 }}>
            <ProjectStatsSection stats={stats} />
          </Box>
        </>
      )}

      <RecentActivity activities={displayActivities} />
    </Box>
  );
}

export default AdminDashboardPage;

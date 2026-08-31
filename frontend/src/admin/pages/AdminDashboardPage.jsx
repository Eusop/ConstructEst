import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import StatCard from '../../features/dashboard/components/StatCard';
import RecentActivity from '../../features/dashboard/components/RecentActivity';
import { useAdminActivity } from '../context/AdminActivityContext';
import { useAdminStores } from '../context/AdminStoresContext';
import { listAdminUsers } from '../services/adminService';
import { formatRelativeTime } from '../../utils/formatRelativeTime';
import { ADMIN_ROUTES } from '../../routes/paths';
import { colors } from '../../theme/palette';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate() {
  const now = new Date();
  return now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Admin dashboard: system-wide stat cards + a recent-activity feed. Every
 * number here is either real (Total/Active Users, from GET /api/admin/users)
 * or admin-session data that starts at zero (Hardware Stores, Materials &
 * Brands configured — see AdminStoresContext) — nothing is seeded/fake, per
 * the spec. Recent activity is empty until the admin actually does
 * something in Users/Stores/Materials/Settings (see logActivity calls there).
 */
function AdminDashboardPage() {
  const { activities } = useAdminActivity();
  const { stores, totalBrandsConfigured } = useAdminStores();
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

  const stats = [
    {
      label: 'Total Users',
      icon: GroupRoundedIcon,
      iconBg: colors.iconBlueBg,
      iconFg: colors.iconBlueFg,
      value: String(userCounts.total),
      viewAllTo: ADMIN_ROUTES.USERS,
    },
    {
      label: 'Active Users',
      icon: CheckCircleRoundedIcon,
      iconBg: colors.iconGreenBg,
      iconFg: colors.iconGreenFg,
      value: String(userCounts.active),
    },
    {
      label: 'Hardware Stores',
      icon: StorefrontRoundedIcon,
      iconBg: colors.iconOrangeBg,
      iconFg: colors.iconOrangeFg,
      value: String(stores.length),
      viewAllTo: ADMIN_ROUTES.STORES,
    },
    {
      label: 'Materials & Brands Configured',
      icon: CategoryRoundedIcon,
      iconBg: colors.iconPurpleBg,
      iconFg: colors.iconPurpleFg,
      value: String(totalBrandsConfigured),
      viewAllTo: ADMIN_ROUTES.MATERIALS,
    },
  ];

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
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.4rem' }, color: 'text.primary' }}>{getGreeting()}, Admin</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>System overview: {getFormattedDate()}</Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
          gap: 2.5,
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

export default AdminDashboardPage;

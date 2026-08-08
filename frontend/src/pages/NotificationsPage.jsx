import { useMemo, useState } from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import NotificationCard from '../features/notifications/components/NotificationCard';
import NotificationFilters from '../features/notifications/components/NotificationFilters';
import EmptyNotificationsState from '../features/notifications/components/EmptyNotificationsState';
import { NOTIFICATION_CATEGORIES } from '../features/notifications/data/notificationTypes';
import { groupNotificationsByDay } from '../features/notifications/utils/groupNotifications';
import { useNotifications } from '../context/NotificationsContext';
import { colors } from '../theme/palette';

function filterNotifications(notifications, filter) {
  if (filter === 'unread') return notifications.filter((notification) => !notification.read);
  if (filter === 'system' || filter === 'projects') {
    return notifications.filter((notification) => NOTIFICATION_CATEGORIES[notification.type] === filter);
  }
  return notifications;
}

/**
 * Notifications: the full feed of project + system updates, grouped by day
 * with filter pills and bulk mark-as-read/clear actions. Reads/writes
 * NotificationsContext, the same feed the Sidebar and header bell badges
 * read their unread count from — clicking an unread card here (or those
 * bulk actions) updates those badges immediately too.
 */
function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => filterNotifications(notifications, filter), [notifications, filter]);
  const groups = useMemo(() => groupNotificationsByDay(filtered), [filtered]);

  return (
    <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { xs: 'flex-start', sm: 'flex-start' }, justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: 'text.primary' }}>Notifications</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
            {unreadCount > 0 ? `You have ${unreadCount} unread update${unreadCount === 1 ? '' : 's'}.` : "You're all caught up."}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
          <Button
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            startIcon={<DoneAllRoundedIcon />}
            sx={{
              bgcolor: 'common.white',
              color: 'text.primary',
              border: '1px solid',
              borderColor: 'grey.300',
              '&:hover': { bgcolor: 'grey.50', borderColor: 'grey.300' },
            }}
          >
            Mark all as read
          </Button>
          <Button
            onClick={clearAll}
            disabled={notifications.length === 0}
            startIcon={<DeleteOutlineRoundedIcon />}
            sx={{
              bgcolor: 'common.white',
              color: colors.iconRedFg,
              border: '1px solid',
              borderColor: 'grey.300',
              '&:hover': { bgcolor: colors.iconRedBg, borderColor: colors.iconRedFg },
            }}
          >
            Clear all
          </Button>
        </Stack>
      </Stack>

      <NotificationFilters filter={filter} onFilterChange={setFilter} counts={{ unread: unreadCount }} />

      {groups.length === 0 ? (
        <EmptyNotificationsState
          message={notifications.length === 0 ? 'No notifications yet.' : 'No notifications match this filter.'}
          detail={
            notifications.length === 0
              ? 'Notifications about your projects and activities will appear here.'
              : 'Try a different filter to see more.'
          }
        />
      ) : (
        <Stack
          spacing={2.5}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            pr: 0.5,
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 999 },
            '&::-webkit-scrollbar-thumb:hover': { bgcolor: 'grey.400' },
          }}
        >
          {groups.map((group) => (
            <Box key={group.key}>
              <Typography
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: 0.75,
                  textTransform: 'uppercase',
                  mb: 1.25,
                }}
              >
                {group.label}
              </Typography>
              <Stack spacing={1.25}>
                {group.items.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} onRead={markAsRead} />
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export default NotificationsPage;

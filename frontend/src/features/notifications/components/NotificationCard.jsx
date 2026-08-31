import { Link as RouterLink } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { NOTIFICATION_TYPES, DEFAULT_NOTIFICATION_TYPE, NOTIFICATION_ACTIONS } from '../data/notificationTypes';
import { formatNotificationTimestamp } from '../utils/groupNotifications';
import { colors } from '../../../theme/palette';

/**
 * One notification row: type icon tile, title (with an unread dot) +
 * description, a right-aligned timestamp, and — where the type has a
 * natural destination (see NOTIFICATION_ACTIONS) — an action link that
 * navigates there exactly like clicking the matching sidebar item would.
 * Unread rows carry a left accent border; clicking the card or its action
 * link marks it read, matching the app's other clickable-card pattern (see
 * StoreListCard).
 *
 * @param {object} props
 * @param {{id: string, type: string, title: string, description: string, timestamp: Date, read: boolean}} props.notification
 * @param {(id: string) => void} props.onRead
 */
function NotificationCard({ notification, onRead }) {
  const { icon: Icon, iconBg, iconFg } = NOTIFICATION_TYPES[notification.type] ?? DEFAULT_NOTIFICATION_TYPE;
  const action = NOTIFICATION_ACTIONS[notification.type];
  const isUnread = !notification.read;

  const handleActivate = () => {
    if (isUnread) onRead(notification.id);
  };

  return (
    <Paper
      elevation={0}
      onClick={handleActivate}
      role={isUnread ? 'button' : undefined}
      tabIndex={isUnread ? 0 : undefined}
      onKeyDown={(event) => {
        if (isUnread && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          handleActivate();
        }
      }}
      sx={{
        borderRadius: 3,
        bgcolor: 'common.white',
        boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
        p: { xs: 1.5, sm: 2 },
        borderLeft: '3px solid',
        borderLeftColor: isUnread ? colors.accentBlue : 'transparent',
        cursor: isUnread ? 'pointer' : 'default',
        transition: 'border-color 0.15s ease',
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        <Box
          sx={{
            width: { xs: 34, sm: 40 },
            height: { xs: 34, sm: 40 },
            flexShrink: 0,
            borderRadius: 2,
            bgcolor: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon sx={{ color: iconFg, fontSize: { xs: 17, sm: 20 } }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: { xs: '0.85rem', sm: '0.92rem' } }}>{notification.title}</Typography>
            {isUnread && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: colors.accentBlue, flexShrink: 0 }} />}
          </Stack>
          <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.78rem', sm: '0.85rem' }, mt: 0.25 }}>{notification.description}</Typography>

          <Stack direction="row" sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
            {action ? (
              <Link
                component={RouterLink}
                to={action.route}
                onClick={() => onRead(notification.id)}
                underline="hover"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, fontSize: '0.75rem', fontWeight: 700, color: colors.accentBlue }}
              >
                {action.label}
                <ArrowForwardRoundedIcon sx={{ fontSize: 14 }} />
              </Link>
            ) : (
              <span />
            )}
            <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {formatNotificationTimestamp(notification.timestamp)}
            </Typography>
          </Stack>

          {action && (
            <Link
              component={RouterLink}
              to={action.route}
              onClick={() => onRead(notification.id)}
              underline="hover"
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                alignItems: 'center',
                gap: 0.4,
                mt: 0.75,
                fontSize: '0.8rem',
                fontWeight: 700,
                color: colors.accentBlue,
              }}
            >
              {action.label}
              <ArrowForwardRoundedIcon sx={{ fontSize: 15 }} />
            </Link>
          )}
        </Box>

        <Typography sx={{ display: { xs: 'none', sm: 'block' }, color: 'text.secondary', fontSize: '0.78rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {formatNotificationTimestamp(notification.timestamp)}
        </Typography>
      </Stack>
    </Paper>
  );
}

export default NotificationCard;

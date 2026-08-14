import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import { colors } from '../../theme/palette';
import { ADMIN_ROUTES } from '../../routes/paths';
import { useUser } from '../../context/UserContext';
import { getInitials } from '../../utils/getInitials';

/**
 * Admin Module top bar — same shell as the User Module's DashboardHeader
 * (sidebar toggle, page title, avatar linking to Profile) but deliberately
 * without the "New Project" action (not an admin concept) or the
 * "Add User" button that the reference mockup showed here: creating users
 * belongs on the User Management page itself (see AdminUsersPage), not the
 * global header.
 */
function AdminHeader({ onToggleSidebar, title = 'Dashboard' }) {
  const { userName, avatarUrl } = useUser();

  return (
    <Box
      component="header"
      sx={{ bgcolor: 'common.white', borderBottom: '1px solid', borderColor: 'divider', px: { xs: 1.5, md: 3 }, py: 1.5 }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: { xs: 1, sm: 2 } }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: { xs: 1, sm: 1.5 }, minWidth: 0, flex: 1 }}>
          <IconButton onClick={onToggleSidebar} aria-label="Toggle sidebar" size="small" sx={{ flexShrink: 0 }}>
            <MenuRoundedIcon />
          </IconButton>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '1.1rem',
              lineHeight: 1,
              color: 'text.primary',
              flexShrink: { xs: 1, sm: 0 },
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </Typography>
        </Stack>

        <Stack direction="row" sx={{ alignItems: 'center', gap: 2.5, flexShrink: 0 }}>
          <Avatar
            component={RouterLink}
            to={ADMIN_ROUTES.PROFILE}
            aria-label="Go to your profile"
            src={avatarUrl ?? undefined}
            sx={{
              bgcolor: colors.accentBlue,
              width: 36,
              height: 36,
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'none',
              '&:hover': { opacity: 0.85 },
            }}
          >
            {getInitials(userName)}
          </Avatar>
        </Stack>
      </Stack>
    </Box>
  );
}

export default AdminHeader;

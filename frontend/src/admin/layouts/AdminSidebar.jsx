import { Link as RouterLink, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import BrandMark from '../../components/BrandMark';
import { colors } from '../../theme/palette';
import { ROUTES, ADMIN_ROUTES } from '../../routes/paths';
import { useUser } from '../../context/UserContext';
// Re-export the exact widths the User Module's Sidebar uses, so the Admin
// shell measures identically instead of drifting from it over time.
import { SIDEBAR_WIDTH_OPEN, SIDEBAR_WIDTH_CLOSED } from '../../layouts/Sidebar';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: GridViewRoundedIcon, to: ADMIN_ROUTES.DASHBOARD },
  { label: 'User Management', icon: GroupRoundedIcon, to: ADMIN_ROUTES.USERS },
  { label: 'Hardware Stores', icon: StorefrontRoundedIcon, to: ADMIN_ROUTES.STORES },
  { label: 'Materials & Brands', icon: CategoryRoundedIcon, to: ADMIN_ROUTES.MATERIALS },
  { label: 'Estimation Settings', icon: TuneRoundedIcon, to: ADMIN_ROUTES.SETTINGS },
];

const UTILITY_ITEMS = [{ label: 'Profile', icon: PersonRoundedIcon, to: ADMIN_ROUTES.PROFILE }];

// Mirrors Sidebar.jsx's NavRow: fixed-size icon, label opacity/max-width
// animates with the sidebar's open/closed transition. `onNavigate`, when
// supplied, fires alongside `onClick` — it's how the mobile/tablet overlay
// closes itself once a destination is actually picked; desktop never passes
// it, so it's a no-op there (see AdminSidebar below).
function NavRow({ item, open, active, onClick, onNavigate }) {
  const Icon = item.icon;
  const handleClick = (event) => {
    onClick?.(event);
    onNavigate?.();
  };
  const linkProps = item.to
    ? { component: RouterLink, to: item.to, onClick: handleClick }
    : { component: 'button', onClick: handleClick };

  return (
    <Tooltip title={open ? '' : item.label} placement="right">
      <Stack
        direction="row"
        {...linkProps}
        sx={{
          alignItems: 'center',
          gap: 1.5,
          px: 1.5,
          py: 1.1,
          borderRadius: 2,
          justifyContent: 'flex-start',
          textDecoration: 'none',
          border: 'none',
          width: '100%',
          textAlign: 'left',
          bgcolor: active ? 'rgba(247, 147, 30, 0.16)' : 'transparent',
          color: active ? colors.orange : 'grey.400',
          '&:hover': { bgcolor: active ? 'rgba(247, 147, 30, 0.16)' : 'rgba(255,255,255,0.06)', cursor: 'pointer' },
        }}
      >
        <Icon sx={{ fontSize: 20, flexShrink: 0 }} />
        <Typography
          sx={{
            fontSize: '0.9rem',
            fontWeight: active ? 700 : 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            opacity: open ? 1 : 0,
            maxWidth: open ? 180 : 0,
            flex: 1,
            transition: (theme) =>
              theme.transitions.create(['opacity', 'max-width'], {
                easing: theme.transitions.easing.easeInOut,
                duration: open ? theme.transitions.duration.enteringScreen : theme.transitions.duration.leavingScreen,
              }),
          }}
        >
          {item.label}
        </Typography>
      </Stack>
    </Tooltip>
  );
}

/**
 * Admin Module sidebar — same width/collapse behavior, dark background,
 * and nav-row styling as the User Module's Sidebar (see layouts/Sidebar.jsx),
 * but with the Admin-only nav list (Dashboard, User Management, Hardware
 * Stores, Materials & Brands, Estimation Settings, Profile, Logout) and no
 * dependency on NotificationsContext, which the Admin layout doesn't mount.
 *
 * Responsive behavior mirrors the User Module's Sidebar exactly: desktop
 * (`md` and up) renders as a normal flex sibling that pushes content over;
 * below `md`, the same nav content renders inside a temporary MUI `Drawer`
 * overlay instead, so it never reserves layout space and never moves the
 * page underneath.
 *
 * @param {object} props
 * @param {boolean} props.open Desktop: expanded vs icon-only. Mobile/tablet: overlay shown vs hidden.
 * @param {() => void} [props.onClose] Mobile/tablet only — closes the overlay (backdrop click, Escape, or picking a nav item).
 */
function AdminSidebar({ open, onClose }) {
  const theme = useTheme();
  const location = useLocation();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { logout } = useUser();

  const isActive = (to) => location.pathname === to || location.pathname.startsWith(`${to}/`);

  const contentOpen = isDesktop ? open : true;
  const onNavigate = isDesktop ? undefined : onClose;

  const content = (
    <>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-start', pl: 0.75, flexShrink: 0 }}>
        <BrandMark height={30} variant="dark" iconOnly={!contentOpen} />
      </Box>

      <Typography
        sx={{
          color: 'grey.600',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: 1,
          px: 1.5,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          opacity: contentOpen ? 1 : 0,
          maxHeight: contentOpen ? 20 : 0,
          mb: contentOpen ? 1 : 0,
          transition: (theme) =>
            theme.transitions.create(['opacity', 'max-height', 'margin-bottom'], {
              easing: theme.transitions.easing.easeInOut,
              duration: contentOpen ? theme.transitions.duration.enteringScreen : theme.transitions.duration.leavingScreen,
            }),
        }}
      >
        ADMINISTRATION
      </Typography>

      <Stack spacing={0.5}>
        {NAV_ITEMS.map((item) => (
          <NavRow key={item.label} item={item} open={contentOpen} active={isActive(item.to)} onNavigate={onNavigate} />
        ))}
      </Stack>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 2, flexShrink: 0 }} />

      <Stack spacing={0.5}>
        {UTILITY_ITEMS.map((item) => (
          <NavRow key={item.label} item={item} open={contentOpen} active={isActive(item.to)} onNavigate={onNavigate} />
        ))}
      </Stack>

      <Box sx={{ mt: 'auto', flexShrink: 0 }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
        <NavRow
          item={{ label: 'Logout', icon: LogoutRoundedIcon, to: ROUTES.LOGIN }}
          open={contentOpen}
          active={false}
          onClick={logout}
          onNavigate={onNavigate}
        />
      </Box>
    </>
  );

  if (isDesktop) {
    return (
      <Box
        component="nav"
        sx={{
          width: open ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED,
          flexShrink: 0,
          bgcolor: colors.ctaBackground,
          color: 'common.white',
          height: '100vh',
          position: 'sticky',
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          px: 1.5,
          py: 2.5,
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: open ? theme.transitions.duration.enteringScreen : theme.transitions.duration.leavingScreen,
          }),
          overflow: 'hidden',
          overflowY: 'auto',
        }}
      >
        {content}
      </Box>
    );
  }

  return (
    <Drawer
      variant="temporary"
      anchor="left"
      open={open}
      onClose={onClose}
      slotProps={{
        root: { keepMounted: true, disableScrollLock: true },
        backdrop: {
          sx: {
            bgcolor: 'rgba(20, 22, 31, 0.35)',
            backdropFilter: 'blur(1.5px)',
          },
        },
        paper: {
          component: 'nav',
          sx: {
            width: SIDEBAR_WIDTH_OPEN,
            boxSizing: 'border-box',
            border: 'none',
            bgcolor: colors.ctaBackground,
            color: 'common.white',
            display: 'flex',
            flexDirection: 'column',
            px: 1.5,
            py: 2.5,
            overflow: 'hidden',
            overflowY: 'auto',
          },
        },
      }}
    >
      {content}
    </Drawer>
  );
}

export default AdminSidebar;

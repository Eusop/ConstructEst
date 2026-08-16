import { useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import Drawer from '@mui/material/Drawer';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import ViewAgendaRoundedIcon from '@mui/icons-material/ViewAgendaRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import BrandMark from '../components/BrandMark';
import { colors } from '../theme/palette';
import { ROUTES } from '../routes/paths';
import { useNotifications } from '../context/NotificationsContext';
import { useUser } from '../context/UserContext';

export const SIDEBAR_WIDTH_OPEN = 248;
export const SIDEBAR_WIDTH_CLOSED = 76;

const WORKSPACE_ITEMS = [
  { label: 'Dashboard', icon: GridViewRoundedIcon, to: ROUTES.DASHBOARD },
  {
    label: 'Projects',
    icon: FolderRoundedIcon,
    to: ROUTES.PROJECTS,
    children: [
      { label: 'Material Estimation', icon: ViewAgendaRoundedIcon, to: ROUTES.MATERIAL_ESTIMATION },
      { label: 'Store Locator', icon: LocationOnRoundedIcon, to: ROUTES.STORE_LOCATOR },
      { label: 'Brand Selection', icon: SellRoundedIcon, to: ROUTES.BRAND_SELECTION },
      { label: 'Bill of Materials', icon: DescriptionRoundedIcon, to: ROUTES.BILL_OF_MATERIALS },
    ],
  },
];

const UTILITY_ITEMS = [
  { label: 'Notifications', icon: NotificationsRoundedIcon, to: ROUTES.NOTIFICATIONS },
  { label: 'Profile', icon: PersonRoundedIcon, to: ROUTES.PROFILE },
  { label: 'Help', icon: HelpOutlineRoundedIcon, href: '#' },
];

// Icon size never varies with `open` (or between the parent "Projects" row
// and its 4 nested children) — only the label's opacity/max-width animate.
// That's deliberate: keeping every icon a fixed, unchanging size is what
// lets the label transition read as a smooth reveal instead of the row
// "popping" to a different size when the sidebar toggles.
function RowContent({ item, open, active, trailing }) {
  const Icon = item.icon;
  return (
    <>
      {Icon && (
        <Badge
          badgeContent={item.badge}
          sx={{ '& .MuiBadge-badge': { bgcolor: colors.orange, color: 'common.white', fontSize: 10, minWidth: 16, height: 16 } }}
        >
          <Icon sx={{ fontSize: 20, flexShrink: 0 }} />
        </Badge>
      )}
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
      {trailing}
    </>
  );
}

// `onNavigate`, when supplied, fires alongside the row's own click handling
// (if any) — it's how the mobile/tablet overlay closes itself once the user
// actually picks a destination. Desktop's permanent sidebar never passes
// it, so there `onNavigate` is undefined and this is a no-op, leaving
// desktop's behavior exactly as it was.
function NavRow({ item, open, active, onNavigate }) {
  const handleClick = (event) => {
    item.onClick?.(event);
    onNavigate?.();
  };
  const linkProps = item.to
    ? { component: RouterLink, to: item.to, onClick: handleClick }
    : { component: 'a', href: item.href, onClick: handleClick };

  return (
    // Tooltip stays mounted at all times (only its content toggles) so the
    // row underneath never remounts — that's what let the label's own
    // opacity/width transition actually play instead of popping instantly.
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
          bgcolor: active ? 'rgba(247, 147, 30, 0.16)' : 'transparent',
          color: active ? colors.orange : 'grey.400',
          '&:hover': { bgcolor: active ? 'rgba(247, 147, 30, 0.16)' : 'rgba(255,255,255,0.06)' },
        }}
      >
        <RowContent item={item} open={open} active={active} />
      </Stack>
    </Tooltip>
  );
}

/**
 * Expandable "Projects" row — one continuously-mounted structure for both
 * sidebar states, not a branch swap between them. That's what makes the
 * transition smooth: the same icon/label/child elements stay in the DOM as
 * `open` flips, so their own opacity/max-width/padding CSS transitions can
 * actually animate instead of instantly popping in at a different size.
 *
 * Expanded sidebar: the row navigates to /projects *and* opens the children
 * if they aren't already open (never collapses them); a separate chevron
 * (stopping propagation) still toggles the children's visibility
 * independently for anyone who wants to close it again. Collapsed sidebar:
 * there's no room for a separate chevron, so clicking the row does both at
 * once — it navigates to /projects *and* toggles the children, every time
 * (toggling doesn't suppress the navigation, and vice versa). Either way
 * `expanded`/`onToggle` is the one state Sidebar owns — toggling the
 * sidebar's own open/closed state never resets or desyncs it.
 *
 * Defaults to expanded whenever the current route is /projects or one of
 * its children, and stays manually toggle-able afterward. `onNavigate` (see
 * NavRow) closes the mobile/tablet overlay after either the row itself or
 * one of its children is clicked; it's undefined on desktop, so it's a
 * no-op there.
 */
function NavGroup({ item, open, active, expanded, onToggle, onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleRowClick = () => {
    if (!open) {
      // Collapsed: there's no separate chevron to live beside the icon, so
      // a single click does both jobs at once — navigation is handled by
      // the underlying RouterLink itself (nothing here prevents it), and
      // this just additionally toggles the children open/closed, exactly
      // like clicking "Projects" in the expanded sidebar navigates while
      // the chevron independently toggles.
      onToggle();
    } else if (!expanded) {
      // Expanded: navigation is handled by the underlying RouterLink itself
      // (nothing here prevents it); additionally open the children if they
      // aren't already open, so the user never has to click the chevron
      // separately. Only opens — never collapses an already-open list, so
      // clicking "Projects" again while browsing a child page doesn't hide it.
      onToggle();
    }
    onNavigate?.();
  };

  return (
    <Box>
      <Tooltip title={open ? '' : item.label} placement="right">
        <Stack
          direction="row"
          component={RouterLink}
          to={item.to}
          aria-expanded={open ? undefined : expanded}
          onClick={handleRowClick}
          onKeyDown={(event) => {
            if (!open && event.key === ' ') {
              // Space doesn't trigger link navigation natively (Enter
              // already does) — toggle and navigate explicitly so Space
              // matches a click.
              event.preventDefault();
              onToggle();
              navigate(item.to);
              onNavigate?.();
            }
          }}
          sx={{
            alignItems: 'center',
            gap: 1.5,
            px: 1.5,
            py: 1.1,
            borderRadius: 2,
            cursor: 'pointer',
            justifyContent: 'flex-start',
            textDecoration: 'none',
            bgcolor: active ? 'rgba(247, 147, 30, 0.16)' : 'transparent',
            color: active ? colors.orange : 'grey.400',
            '&:hover': { bgcolor: active ? 'rgba(247, 147, 30, 0.16)' : 'rgba(255,255,255,0.06)' },
          }}
        >
          <RowContent
            item={item}
            open={open}
            active={active}
            trailing={
              open && (
                <Box
                  role="button"
                  aria-label={expanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggle();
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 1,
                    p: 0.25,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                  }}
                >
                  <ExpandMoreRoundedIcon
                    sx={{
                      fontSize: 20,
                      transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </Box>
              )
            }
          />
        </Stack>
      </Tooltip>

      <Collapse in={expanded} timeout={220}>
        <Stack
          spacing={0.25}
          sx={{
            mt: 0.25,
            pl: open ? 2 : 0,
            transition: (theme) =>
              theme.transitions.create('padding-left', {
                easing: theme.transitions.easing.easeInOut,
                duration: open ? theme.transitions.duration.enteringScreen : theme.transitions.duration.leavingScreen,
              }),
          }}
        >
          {item.children.map((child) => {
            const childActive = location.pathname === child.to || location.pathname.startsWith(`${child.to}/`);
            return <NavRow key={child.label} item={child} open={open} active={childActive} onNavigate={onNavigate} />;
          })}
        </Stack>
      </Collapse>
    </Box>
  );
}

/**
 * Collapsible app sidebar: brand mark, primary "workspace" navigation,
 * utility links, and logout. Width animates between collapsed (icon-only)
 * and expanded (icon + label) states using MUI's own drawer-style
 * transition; icons stay in a fixed position and labels fade/slide in
 * place rather than mounting or jumping. The "Projects" item is a
 * collapsible group (see NavGroup) so its 4 workspace pages live as a
 * submenu instead of flat top-level items.
 *
 * Desktop (`md` and up) renders exactly as before: a normal flex sibling
 * that's always visible and pushes the page content over as it widens.
 * Below `md`, the same nav content instead renders inside a MUI `Drawer`
 * (`variant="temporary"`) — a fixed-position overlay with its own backdrop,
 * shown only while `open`, that never reserves layout space and never
 * moves the page underneath. Both branches render the exact same nav item
 * list/labels/icons/animation; only the outer container and how `open` is
 * interpreted differ, so "desktop behavior" and "mobile/tablet behavior"
 * can't drift apart from each other by accident.
 *
 * @param {object} props
 * @param {boolean} props.open Desktop: expanded vs icon-only. Mobile/tablet: overlay shown vs hidden.
 * @param {() => void} [props.onClose] Mobile/tablet only — closes the overlay (backdrop click, Escape, or picking a nav item).
 */
function Sidebar({ open, onClose }) {
  const theme = useTheme();
  const location = useLocation();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [manualExpanded, setManualExpanded] = useState(null);
  const { unreadCount } = useNotifications();
  const { logout } = useUser();

  const utilityItems = UTILITY_ITEMS.map((item) =>
    item.label === 'Notifications' ? { ...item, badge: unreadCount || undefined } : item,
  );

  // A nav item stays highlighted for its own nested routes too (e.g. "Projects"
  // stays active on /projects/new), not just on an exact pathname match.
  const isActive = (to) => location.pathname === to || location.pathname.startsWith(`${to}/`);

  // On desktop the sidebar is always visible and `open` picks its width
  // (icon-only vs labeled). On the mobile/tablet overlay there's no
  // icon-only state — it's either shown fully labeled, or not shown at
  // all — and picking a destination should close it, the way any mobile
  // nav drawer does.
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
        WORKSPACE
      </Typography>

      <Stack spacing={0.5}>
        {WORKSPACE_ITEMS.map((item) => {
          if (item.children) {
            const isChildRouteActive = item.children.some((child) => isActive(child.to));
            const groupActive = isActive(item.to) || isChildRouteActive;
            const expanded = manualExpanded ?? isChildRouteActive;
            return (
              <NavGroup
                key={item.label}
                item={item}
                open={contentOpen}
                active={groupActive}
                expanded={expanded}
                onToggle={() => setManualExpanded(!expanded)}
                onNavigate={onNavigate}
              />
            );
          }
          return (
            <NavRow
              key={item.label}
              item={item}
              open={contentOpen}
              active={Boolean(item.to) && isActive(item.to)}
              onNavigate={onNavigate}
            />
          );
        })}
      </Stack>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 2, flexShrink: 0 }} />

      <Stack spacing={0.5}>
        {utilityItems.map((item) => (
          <NavRow
            key={item.label}
            item={item}
            open={contentOpen}
            active={Boolean(item.to) && isActive(item.to)}
            onNavigate={onNavigate}
          />
        ))}
      </Stack>

      <Box sx={{ mt: 'auto', flexShrink: 0 }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
        <NavRow
          item={{ label: 'Logout', icon: LogoutRoundedIcon, to: ROUTES.LOGIN, onClick: logout }}
          open={contentOpen}
          active={false}
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

  // Mobile/small tablet: a temporary Drawer overlay instead of a permanent
  // flex sibling — it's rendered in a portal above the page (so the page
  // never resizes to make room for it), pinned to the viewport with its own
  // scroll, and paired with a backdrop the page stays visible (and, per
  // `disableScrollLock`, scrollable) behind. `keepMounted` matches MUI's own
  // guidance for mobile drawers (better open transition performance).
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

export default Sidebar;

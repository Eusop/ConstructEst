import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { colors } from '../theme/palette';
import { ROUTES } from '../routes/paths';
import { useUser } from '../context/UserContext';
import { getInitials } from '../utils/getInitials';

/**
 * App top bar shared by all authenticated pages: sidebar toggle, page
 * title (or breadcrumb trail for nested pages), a persistent "New Project"
 * action, and the profile action.
 *
 * @param {object} props
 * @param {() => void} props.onToggleSidebar Called when the menu button is clicked.
 * @param {string} [props.title='Dashboard'] Page title shown next to the menu button.
 * @param {string} [props.subtitle] Optional muted "· <subtitle>" suffix after the title
 *   (e.g. the active project's name). Ignored when `breadcrumbs` is set.
 * @param {Array<{label: string, to?: string}>} [props.breadcrumbs] When set, renders a
 *   breadcrumb trail instead of the plain title. Every crumb but the last is a link.
 * @param {React.ReactNode} [props.headerBadge] Optional extra element shown before the
 *   New Project button (e.g. Brand Selection's selected-store chip).
 */
function DashboardHeader({ onToggleSidebar, title = 'Dashboard', subtitle, breadcrumbs, headerBadge }) {
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
          {breadcrumbs ? (
            <Breadcrumbs
              separator={<ChevronRightRoundedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />}
              sx={{ minWidth: 0, overflow: 'hidden', '& .MuiBreadcrumbs-ol': { alignItems: 'center', flexWrap: 'nowrap' } }}
            >
              {breadcrumbs.map((crumb, index) =>
                index === breadcrumbs.length - 1 ? (
                  <Typography
                    key={crumb.label}
                    sx={{
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      lineHeight: 1,
                      color: 'text.primary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {crumb.label}
                  </Typography>
                ) : (
                  <Link
                    key={crumb.label}
                    component={RouterLink}
                    to={crumb.to}
                    underline="none"
                    sx={{
                      fontSize: '1.1rem',
                      lineHeight: 1,
                      color: 'text.secondary',
                      whiteSpace: 'nowrap',
                      '&:hover': { color: 'text.primary' },
                    }}
                  >
                    {crumb.label}
                  </Link>
                ),
              )}
            </Breadcrumbs>
          ) : (
            // title/subtitle are direct flex items of this row (not a nested
            // Stack) so flexShrink:0 on title actually protects it — nesting
            // them in their own Stack let that inner Stack get squeezed
            // smaller than title's content by this row's own shrinking,
            // clipping title instead of just hiding the subtitle. Below the
            // sm breakpoint there's not always room for the full title
            // either (e.g. "Material Estimation" next to a subtitle on a
            // narrow phone), so title gets its own ellipsis fallback there
            // too — subtitle still shrinks first via its much larger
            // flexShrink, title only gives up characters once subtitle is
            // already down to nothing.
            <>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '0.95rem', sm: '1.1rem' },
                  lineHeight: 1,
                  color: 'text.primary',
                  flexShrink: 0,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  sx={{
                    display: { xs: 'none', sm: 'block' },
                    fontSize: '1.1rem',
                    lineHeight: 1,
                    color: 'text.secondary',
                    minWidth: 0,
                    flexShrink: 20,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  · {subtitle}
                </Typography>
              )}
            </>
          )}
        </Stack>

        <Stack direction="row" sx={{ alignItems: 'center', gap: { xs: 1, sm: 2.5 }, flexShrink: 0 }}>
          {headerBadge}
          <Button
            component={RouterLink}
            to={ROUTES.NEW_PROJECT}
            variant="contained"
            disableElevation
            startIcon={<AddRoundedIcon />}
            sx={{
              display: { xs: 'none', md: 'inline-flex' },
              bgcolor: colors.accentBlue,
              '&:hover': { bgcolor: colors.accentBlueDark },
            }}
          >
            New Project
          </Button>

          {/* Desktop (`md`+): colored avatar, as before. */}
          <Avatar
            component={RouterLink}
            to={ROUTES.PROFILE}
            aria-label="Go to your profile"
            src={avatarUrl ?? undefined}
            sx={{
              display: { xs: 'none', md: 'flex' },
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

          {/* Mobile only: compact icon-only version of the New Project
              button above (that one's hidden below `md`), same action and
              color, just sized down to fit next to the profile icon. */}
          <IconButton
            component={RouterLink}
            to={ROUTES.NEW_PROJECT}
            aria-label="New Project"
            sx={{
              display: { xs: 'flex', md: 'none' },
              flexShrink: 0,
              width: 30,
              height: 30,
              bgcolor: colors.accentBlue,
              color: 'common.white',
              '&:hover': { bgcolor: colors.accentBlueDark },
            }}
          >
            <AddRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>

          {/* Mobile/tablet (below `md`): moved up from the old bottom tab
              bar — icon-only (no label), centered on the row like the
              hamburger/title beside it. */}
          <Box
            component={RouterLink}
            to={ROUTES.PROFILE}
            aria-label="Profile"
            sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', justifyContent: 'center', flexShrink: 0, textDecoration: 'none' }}
          >
            {/* Same colored-avatar treatment as the desktop header's
                Profile icon (see the `md`+ Avatar above) — just sized
                down to fit this compact spot. */}
            <Avatar
              src={avatarUrl ?? undefined}
              sx={{ width: 30, height: 30, bgcolor: colors.accentBlue, fontSize: '0.72rem', fontWeight: 700 }}
            >
              {getInitials(userName)}
            </Avatar>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}

export default DashboardHeader;

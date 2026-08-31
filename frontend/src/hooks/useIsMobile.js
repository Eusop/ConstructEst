import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

/**
 * True below the `md` breakpoint — the same cutoff the Sidebar/AdminSidebar
 * already use to switch from a permanent flex sibling to a temporary Drawer
 * overlay. Use this wherever a mobile/desktop split can't be expressed as a
 * pure CSS `sx={{ display: { xs: ..., md: ... } }}` toggle (a numeric prop,
 * an MUI `fullScreen` prop, etc.) — for anything CSS can express, prefer the
 * `display` breakpoint object instead so both branches stay mounted.
 */
export function useIsMobile() {
  const theme = useTheme();
  return !useMediaQuery(theme.breakpoints.up('md'));
}

import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

/** True below the md breakpoint (same as the sidebars). Use only when CSS display can't do the job. */
export function useIsMobile() {
  const theme = useTheme();
  return !useMediaQuery(theme.breakpoints.up('md'));
}

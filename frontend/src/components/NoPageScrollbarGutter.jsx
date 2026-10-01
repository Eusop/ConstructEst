import GlobalStyles from '@mui/material/GlobalStyles';

/**
 * Removes the empty scrollbar space on the right edge of app pages.
 * Used in DashboardLayout and AdminLayout, where the page itself never scrolls.
 */
function NoPageScrollbarGutter() {
  return <GlobalStyles styles={{ html: { scrollbarGutter: 'auto' } }} />;
}

export default NoPageScrollbarGutter;

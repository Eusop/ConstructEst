import GlobalStyles from '@mui/material/GlobalStyles';

/**
 * Turns off the page-level scrollbar gutter that styles/index.css reserves on
 * <html>, for as long as this is mounted. DashboardLayout and AdminLayout are
 * fixed-height shells whose content area scrolls on its own, so <html> never
 * scrolls there and the reserved gutter only showed as an empty white strip
 * down the right edge. Public pages, which do scroll the whole page, keep it.
 */
function NoPageScrollbarGutter() {
  return <GlobalStyles styles={{ html: { scrollbarGutter: 'auto' } }} />;
}

export default NoPageScrollbarGutter;

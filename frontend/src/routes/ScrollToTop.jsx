import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Resets scroll position on every route change. Without this, the browser
// keeps whatever scrollY the previous page was at, so navigating from a
// scrolled-down page lands you mid-way down the next one instead of the top.
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default ScrollToTop;

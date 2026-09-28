import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Scrolls to the top on every route change. Otherwise the next page opens
// at the previous page's scroll position.
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default ScrollToTop;

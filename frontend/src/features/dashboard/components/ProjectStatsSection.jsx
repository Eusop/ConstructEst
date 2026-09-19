import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import StatCard from './StatCard';
import { colors } from '../../../theme/palette';

/**
 * A dashboard's stat cards, phones only: a horizontal swipeable carousel
 * below its full-width greeting card. Shared by both the User Module's
 * Dashboard (pages/DashboardPage, its own 3 project stat cards) and the
 * Admin Module's (admin/pages/AdminDashboardPage, its Total/Active
 * Users + Hardware Stores) — content-agnostic, just takes whatever `stats`
 * it's given. Both render this only below `sm`; tablet/desktop uses its own
 * 2x2 grid with these same cards instead, laid out directly there.
 *
 * The carousel is plain CSS scroll-snap, not a JS drag/swipe library:
 * native touch scrolling already gives a smooth, natural swipe, and a
 * horizontal scroller is a different axis from the page's own vertical
 * scroll, so the two never fight each other. Each slide is 88% of the
 * track's width so a sliver of its neighbor peeks in at both edges as a
 * visual "there's more" cue, on top of the dot row below.
 *
 * `iconOnMobile` on each phone StatCard swaps its "View All" text for the
 * small eye icon on phones without shrinking its padding/icon/type the way
 * StatCard's separate `dense` prop does — a carousel slide already gets
 * most of the viewport's width, so it doesn't need compact sizing, just
 * the same icon affordance.
 *
 * @param {object} props
 * @param {Array<object>} props.stats StatCard prop objects (label, icon, iconBg, iconFg, value, viewAllTo?).
 */
function ProjectStatsSection({ stats }) {
  const scrollRef = useRef(null);
  const rafRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = scrollRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      const progress = maxScroll > 0 ? el.scrollLeft / maxScroll : 0;
      setActiveIndex(Math.round(progress * (stats.length - 1)));
    });
  };

  return (
    <Box>
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          display: 'flex',
          gap: 1.5,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          px: '6%',
          // A little bottom room so nothing (e.g. a card's own shadow)
          // looks clipped by the scroll container's edge.
          pb: 0.5,
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        {stats.map((stat) => (
          <Box key={stat.label} sx={{ flex: '0 0 88%', scrollSnapAlign: 'center', minWidth: 0 }}>
            <StatCard iconOnMobile {...stat} />
          </Box>
        ))}
      </Box>

      {/* Pagination dots: purely a "you're on card N of 3, swipe for
          more" indicator — not themselves interactive, the swipe is. */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.75, mt: 1.25 }}>
        {stats.map((stat, index) => (
          <Box
            key={stat.label}
            sx={{
              width: index === activeIndex ? 16 : 6,
              height: 6,
              borderRadius: 999,
              bgcolor: index === activeIndex ? colors.accentBlue : 'grey.300',
              transition: 'width 0.2s ease, background-color 0.2s ease',
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

export default ProjectStatsSection;

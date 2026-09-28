import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import StatCard from './StatCard';
import { colors } from '../../../theme/palette';

/**
 * Dashboard stat cards for phones only: a horizontal swipeable carousel below
 * the full-width greeting card. Shared by the User Dashboard (3 project cards)
 * and the Admin Dashboard (Total/Active Users, Hardware Stores), so it just
 * renders whatever `stats` it gets. Both render it below `sm`; tablet/desktop
 * uses a 2x2 grid instead. It uses plain CSS scroll-snap, not a swipe library,
 * since native touch scrolling is smooth and a horizontal scroller doesn't fight
 * the page's vertical scroll. Each slide is 88% of the track so a sliver of the
 * next one peeks in as a "there's more" cue. `iconOnMobile` on each StatCard
 * swaps "View All" for the eye icon without shrinking the card like `dense` does.
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
          // A little bottom room so a card's shadow isn't clipped by the scroll container.
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

      {/* Pagination dots: only show which card of 3 you're on. Not interactive; the swipe is. */}
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

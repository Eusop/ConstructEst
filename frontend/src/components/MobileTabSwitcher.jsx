import { useState, Children } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

/**
 * Wraps exactly two sibling sections (e.g. two full-height config cards)
 * that would otherwise stack on top of each other below `md`, each a fairly
 * long scroll on a phone (sliders, accordion groups, ...). Below `md`, a
 * 2-tab bar picks which one is visible; both stay mounted the whole time
 * (only `display` toggles), so neither one's internal state — a slider
 * value, an open accordion — resets when switching tabs.
 *
 * `md` and up render both children exactly as the parent already lays them
 * out (side by side or stacked, whichever the parent's own breakpoint
 * says) — this component adds nothing there beyond the tab bar itself,
 * which is hidden.
 *
 * @param {object} props
 * @param {[string, string]} props.labels Tab labels, one per child.
 * @param {React.ReactNode} props.children Exactly two elements.
 */
function MobileTabSwitcher({ labels, children }) {
  const [active, setActive] = useState(0);
  const items = Children.toArray(children);

  return (
    <>
      <Tabs
        value={active}
        onChange={(event, value) => setActive(value)}
        variant="fullWidth"
        sx={{
          display: { xs: 'flex', md: 'none' },
          minHeight: 40,
          mb: 1.5,
          borderRadius: 2,
          bgcolor: 'grey.100',
          p: 0.5,
          '& .MuiTabs-indicator': { display: 'none' },
          '& .MuiTab-root': {
            minHeight: 32,
            borderRadius: 1.5,
            fontSize: '0.82rem',
            fontWeight: 700,
            textTransform: 'none',
            color: 'text.secondary',
          },
          '& .Mui-selected': { bgcolor: 'common.white', color: 'text.primary' },
        }}
      >
        {labels.map((label) => (
          <Tab key={label} label={label} disableRipple />
        ))}
      </Tabs>

      {items.map((child, index) => (
        <Box key={labels[index]} sx={{ display: { xs: index === active ? 'flex' : 'none', md: 'flex' }, flex: 1, minWidth: 0 }}>
          {child}
        </Box>
      ))}
    </>
  );
}

export default MobileTabSwitcher;

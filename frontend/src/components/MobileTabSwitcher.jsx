import { useState, Children } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

/**
 * Wraps exactly two sibling sections (e.g. two long config cards) that would
 * stack on a phone. Below `md`, a 2-tab bar picks the visible one. Both stay
 * mounted (only `display` toggles), so state like a slider value or an open
 * accordion is kept when switching tabs.
 *
 * `md` and up show both side by side (stacked below `lg` if there is no room)
 * in this component's own inner Stack. It returns one wrapping Box (Tabs use
 * their own `mb` spacing), so a caller's Stack only sees a single child and
 * cannot add phantom sibling spacing.
 *
 * @param {object} props
 * @param {[string, string]} props.labels Tab labels, one per child.
 * @param {React.ReactNode} props.children Exactly two elements.
 */
function MobileTabSwitcher({ labels, children }) {
  const [active, setActive] = useState(0);
  const items = Children.toArray(children);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
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

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ flex: 1, minWidth: 0, alignItems: 'stretch' }}>
        {items.map((child, index) => (
          <Box key={labels[index]} sx={{ display: { xs: index === active ? 'flex' : 'none', md: 'flex' }, flex: 1, minWidth: 0 }}>
            {child}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

export default MobileTabSwitcher;

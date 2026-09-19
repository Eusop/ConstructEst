import { useState, Children } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
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
 * `md` and up show both children side by side (or stacked below `lg`, if
 * there isn't room yet) via this component's own inner Stack — both
 * breakpoints live here now, not split between this file and each caller.
 * They used to be: the caller wrapped this whole component in its own
 * `Stack direction={{ xs: 'column', lg: 'row' }}`, with the `md`-vs-tabs
 * switch handled here. That worked visually but had a real bug: this
 * component used to return a bare Fragment (Tabs, then the content Boxes,
 * as separate top-level elements), so the *caller's* Stack saw the Tabs bar
 * as a real DOM sibling preceding the first content Box — and MUI Stack's
 * `spacing` applies margin to any child with a preceding sibling via a
 * plain CSS sibling selector, which doesn't care whether that sibling is
 * `display: none`. At `md`+ (Tabs hidden, spacing switched to margin-left
 * for row layout) that meant the first content Box quietly got an extra
 * phantom margin-left the second one didn't, shifting the whole row right
 * of where it should align with unrelated sibling content elsewhere on the
 * page. Returning one real wrapping Box here — with Tabs' own spacing
 * self-contained (`mb`) and the content row in its own inner Stack — means
 * a caller's Stack (if it still wraps this in one, unnecessary now but
 * harmless) only ever sees a single child, so it has no sibling to add
 * phantom spacing around in the first place.
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

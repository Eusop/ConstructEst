import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { colors } from '../../../theme/palette';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'system', label: 'System' },
  { key: 'projects', label: 'Projects' },
];

function FilterPill({ label, count, selected, onClick }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: { xs: 1, sm: 1.75 },
        py: { xs: 0.5, sm: 0.75 },
        borderRadius: 999,
        border: '1px solid',
        borderColor: selected ? colors.accentBlue : 'grey.300',
        bgcolor: selected ? colors.accentBlue : 'common.white',
        color: selected ? 'common.white' : 'text.secondary',
        fontSize: { xs: '0.7rem', sm: '0.82rem' },
        fontWeight: 700,
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
        '&:hover': selected ? {} : { borderColor: colors.accentBlue, color: colors.accentBlue },
      }}
    >
      {label}
      {typeof count === 'number' ? ` ${count}` : ''}
    </Box>
  );
}

/**
 * "All / Unread / System / Projects" filter row above the notification
 * list — plain standalone pills (not a grouped toggle track) matching the
 * reference layout, styled with the app's existing accentBlue selected
 * state and StatusChip-style pill shape.
 *
 * @param {object} props
 * @param {'all'|'unread'|'system'|'projects'} props.filter
 * @param {(filter: string) => void} props.onFilterChange
 * @param {{unread?: number}} props.counts
 */
function NotificationFilters({ filter, onFilterChange, counts }) {
  return (
    <Stack direction="row" spacing={{ xs: 0.75, sm: 1 }} sx={{ flexWrap: { xs: 'nowrap', sm: 'wrap' }, rowGap: 1 }}>
      {FILTERS.map((item) => (
        <FilterPill
          key={item.key}
          label={item.label}
          count={counts[item.key]}
          selected={filter === item.key}
          onClick={() => onFilterChange(item.key)}
        />
      ))}
    </Stack>
  );
}

export default NotificationFilters;

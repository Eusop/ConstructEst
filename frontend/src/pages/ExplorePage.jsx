import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import PriorityPicker from '../features/projects/components/PriorityPicker';
import { DEFAULT_PRIORITY } from '../features/projects/data/priority';
import ExploreProjectCard from '../features/explore/components/ExploreProjectCard';
import ExploreDetailDialog from '../features/explore/components/ExploreDetailDialog';
import { apiRequest } from '../services/apiClient';
import { keepDecimal } from '../utils/validators';
import { colors } from '../theme/palette';

const EMPTY_SEARCH = { area: '', storeys: '', budget: '' };

function buildQuery(search, order, page) {
  const params = new URLSearchParams({ order: order.join(','), page: String(page) });
  Object.entries(search).forEach(([key, value]) => { if (value !== '' && value !== '.') params.set(key, value); });
  return params.toString();
}

/**
 * Explore Projects: browse houses other users chose to share, to see what a
 * house of a given floor area and number of storeys costs. Optional search by
 * floor area, storeys and budget, ranked by importance (Nov 3 2026 defense
 * recommendation). Shows no names, owners or locations.
 */
function ExplorePage() {
  const [search, setSearch] = useState(EMPTY_SEARCH);
  const [order, setOrder] = useState(DEFAULT_PRIORITY);
  // What the feed was last loaded with; the form can change before Search.
  const [applied, setApplied] = useState({ search: EMPTY_SEARCH, order: DEFAULT_PRIORITY });
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, searching: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = useCallback((page) => {
    setLoading(true);
    return apiRequest(`/explore?${buildQuery(applied.search, applied.order, page)}`)
      .then((data) => {
        setItems((prev) => (page === 1 ? data.items : [...prev, ...data.items]));
        setMeta({ total: data.total, page: data.page, searching: data.searching });
        setError('');
      })
      .catch((err) => setError(err.message || 'Could not load shared projects.'))
      .finally(() => setLoading(false));
  }, [applied]);

  useEffect(() => {
    // First page each time a search is applied; the request sets the state.
    Promise.resolve().then(() => load(1));
  }, [load]);

  const setField = (name) => (event) => {
    const value = name === 'storeys' ? event.target.value : keepDecimal(event.target.value);
    setSearch((prev) => ({ ...prev, [name]: value }));
  };
  const hasSearch = Object.values(search).some((v) => v !== '');

  return (
    <Stack spacing={2.5} sx={{ minWidth: 0 }}>
      <Box>
        <Typography component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.4rem' }, color: 'text.primary' }}>Explore projects</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
          Houses other users shared, to see what a house of a given size costs. Costs use today&apos;s prices at the cheapest
          store that sells every material. Owners and locations are never shown.
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 3, bgcolor: 'common.white', boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)', p: { xs: 2, md: 2.5 } }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 1.25 }}>Find houses like yours</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            size="small" label="Floor area" value={search.area} onChange={setField('area')} fullWidth
            slotProps={{ htmlInput: { inputMode: 'decimal' }, input: { endAdornment: <InputAdornment position="end">m²</InputAdornment> } }}
          />
          <TextField size="small" select label="Storeys" value={search.storeys} onChange={setField('storeys')} fullWidth>
            <MenuItem value="">Any</MenuItem>
            <MenuItem value="1">1 storey</MenuItem>
            <MenuItem value="2">2 storeys</MenuItem>
          </TextField>
          <TextField
            size="small" label="Budget ceiling" value={search.budget} onChange={setField('budget')} fullWidth
            slotProps={{ htmlInput: { inputMode: 'decimal' }, input: { startAdornment: <InputAdornment position="start">₱</InputAdornment> } }}
          />
        </Stack>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'text.secondary', mt: 1.75, mb: 0.75 }}>
          Priority (1 = most important). Leave a field blank to ignore it.
        </Typography>
        <PriorityPicker order={order} onChange={setOrder} />
        <Stack direction="row" spacing={1} sx={{ mt: 1.75, justifyContent: { xs: 'stretch', sm: 'flex-end' } }}>
          <Button
            onClick={() => { setSearch(EMPTY_SEARCH); setOrder(DEFAULT_PRIORITY); setApplied({ search: EMPTY_SEARCH, order: DEFAULT_PRIORITY }); }}
            disabled={!hasSearch && !meta.searching}
            sx={{ flex: { xs: 1, sm: 'none' } }}
          >
            Clear
          </Button>
          <Button
            variant="contained" disableElevation onClick={() => setApplied({ search, order })}
            sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark }, flex: { xs: 1, sm: 'none' } }}
          >
            Search
          </Button>
        </Stack>
      </Paper>

      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
        {meta.total === 0 && !loading ? '' : `${meta.total} shared project${meta.total === 1 ? '' : 's'}${meta.searching ? ', best match first' : ', newest first'}`}
      </Typography>

      {error && <Typography sx={{ color: colors.iconRedFg, fontSize: '0.9rem' }}>{error}</Typography>}
      {!error && !loading && items.length === 0 && (
        <Paper elevation={0} sx={{ borderRadius: 3, bgcolor: 'common.white', p: 4, textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 700 }}>No shared projects yet</Typography>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.5 }}>
            Open one of your Complete projects and turn on &quot;Share in Explore&quot; on its Results or Material Estimation page.
          </Typography>
        </Paper>
      )}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
        {items.map((project) => <ExploreProjectCard key={project.id} project={project} onOpen={() => setOpenId(project.id)} />)}
      </Box>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={26} /></Box>}
      {!loading && items.length < meta.total && (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button variant="outlined" onClick={() => load(meta.page + 1)}>Load more</Button>
        </Box>
      )}

      <ExploreDetailDialog projectId={openId} onClose={() => setOpenId(null)} />
    </Stack>
  );
}

export default ExplorePage;

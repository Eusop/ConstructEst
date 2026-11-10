import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import SharedFloorPlan from './SharedFloorPlan';
import { apiRequest } from '../../../services/apiClient';
import { formatMeasurement, formatPeso, formatQuantity } from '../../../utils/formatNumbers';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { colors } from '../../../theme/palette';

const CELL = { fontSize: '0.8rem', py: 0.75, px: 1 };

/**
 * Read-only details of a shared project: its floor plan (if shared), every
 * material with its quantity, and each store's total at today's prices.
 *
 * @param {object} props
 * @param {number|null} props.projectId Null keeps the dialog closed.
 * @param {() => void} props.onClose
 */
function ExploreDetailDialog({ projectId, onClose }) {
  const isMobile = useIsMobile();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (projectId == null) return undefined;
    let cancelled = false;
    Promise.resolve()
      .then(() => { if (!cancelled) { setDetail(null); setError(''); } })
      .then(() => apiRequest(`/explore/${projectId}`))
      .then((data) => { if (!cancelled) setDetail(data); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not load this project.'); });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <Dialog open={projectId != null} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile} disableScrollLock>
      <DialogTitle sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
        {detail?.projectName ?? 'Shared project'}
        {detail && <Typography component="span" sx={{ display: 'block', fontSize: '0.85rem', color: 'text.secondary' }}>{detail.label}</Typography>}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Typography sx={{ color: colors.iconRedFg, fontSize: '0.9rem' }}>{error}</Typography>}
        {!error && !detail && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={26} /></Box>}
        {detail && (
          <Stack spacing={2.5}>
            <Typography sx={{ fontSize: '0.88rem', color: 'text.primary' }}>
              {formatMeasurement(detail.floorArea, ' m²')} · {detail.storeys} storey{detail.storeys === 1 ? '' : 's'} · Budget ceiling {formatPeso(detail.budgetCeiling)}
              {detail.estimatedTotal != null && <> · <strong>{formatPeso(detail.estimatedTotal)}</strong> ({formatPeso(detail.costPerSqm)} per m²) at {detail.storeName}</>}
            </Typography>

            {detail.hasFloorPlan && <SharedFloorPlan projectId={detail.id} height={230} showSecondFloor />}

            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 0.75 }}>Store totals (today&apos;s prices)</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead><TableRow><TableCell sx={CELL}>Store</TableCell><TableCell sx={CELL} align="right">Total</TableCell><TableCell sx={CELL}>Note</TableCell></TableRow></TableHead>
                  <TableBody>
                    {detail.stores.map((s) => (
                      <TableRow key={s.name}>
                        <TableCell sx={CELL}>{s.name}{s.recommended ? ' (cheapest complete)' : ''}</TableCell>
                        <TableCell sx={CELL} align="right">{formatPeso(s.total)}</TableCell>
                        <TableCell sx={{ ...CELL, color: 'text.secondary' }}>{s.complete ? 'Sells every material' : `Missing: ${s.missing.join(', ')}`}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 0.75 }}>Materials</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead><TableRow><TableCell sx={CELL}>Material</TableCell><TableCell sx={CELL} align="right">Quantity</TableCell></TableRow></TableHead>
                  <TableBody>
                    {detail.materials.map((m) => (
                      <TableRow key={m.key}>
                        <TableCell sx={CELL}>{m.name}</TableCell>
                        <TableCell sx={CELL} align="right">{formatQuantity(m.quantity, m.unit)} {m.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ExploreDetailDialog;

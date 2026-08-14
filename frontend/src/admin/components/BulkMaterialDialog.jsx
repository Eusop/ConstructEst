import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import FormTextField from '../../components/FormTextField';
import { colors } from '../../theme/palette';

/**
 * Price/availability editor for bulk commodities (Sand, Gravel) — no brand
 * concept at all, per requirement 13, unlike BrandFormDialog.
 */
function BulkMaterialDialog({ open, materialName, unit, data, onClose, onSubmit }) {
  const [form, setForm] = useState({ price: '', available: true });
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ price: data?.price != null ? String(data.price) : '', available: data?.available ?? true });
      setError('');
    }
  }, [open, data]);

  const handleSubmit = () => {
    if (!form.price || Number.isNaN(Number(form.price)) || Number(form.price) < 0) {
      setError('Enter a valid price');
      return;
    }
    onSubmit({ price: Number(form.price), available: form.available });
  };

  return (
    <Dialog open={open} onClose={onClose} disableScrollLock maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Edit {materialName}
        <Typography sx={{ fontWeight: 400, fontSize: '0.85rem', color: 'text.secondary', mt: 0.25 }}>Bulk material · priced directly, no brands</Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ pt: 0.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Unit price ({unit})</Typography>
            <FormTextField
              value={form.price}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, price: event.target.value }));
                setError('');
              }}
              error={Boolean(error)}
              helperText={error || ' '}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">₱</InputAdornment> } }}
            />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Availability</Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={form.available ? 'available' : 'out'}
              onChange={(event, value) => value && setForm((prev) => ({ ...prev, available: value === 'available' }))}
              sx={{
                bgcolor: 'grey.100',
                borderRadius: 2,
                p: 0.5,
                '& .MuiToggleButton-root': { border: 'none', borderRadius: 1.5, fontWeight: 600, textTransform: 'none' },
                '& .Mui-selected': { bgcolor: '#fff!important', color: `${colors.iconGreenFg}!important` },
              }}
            >
              <ToggleButton value="available">Available</ToggleButton>
              <ToggleButton value="out">Out of stock</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          sx={{ bgcolor: 'common.white', color: 'text.primary', border: '1px solid', borderColor: 'grey.300', '&:hover': { bgcolor: 'grey.50', borderColor: 'grey.300' } }}
        >
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disableElevation sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}>
          Save changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default BulkMaterialDialog;

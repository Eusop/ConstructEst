import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import FormTextField from '../../components/FormTextField';
import { isRequired } from '../../utils/validators';
import { useIsMobile } from '../../hooks/useIsMobile';
import { colors } from '../../theme/palette';

const EMPTY_FORM = { name: '', address: '', lat: '', lng: '' };

function validate(form) {
  const errors = {};
  if (!isRequired(form.name)) errors.name = 'Store name is required';
  if (!isRequired(form.address)) errors.address = 'Address is required';
  if (form.lat && Number.isNaN(Number(form.lat))) errors.lat = 'Latitude must be a number';
  if (form.lng && Number.isNaN(Number(form.lng))) errors.lng = 'Longitude must be a number';
  return errors;
}

/**
 * Add Hardware Store dialog — Name/Address plus optional coordinates so the
 * store can plot on the map above (see AdminStoresPage). Coordinates are
 * entered manually rather than picked via Places Autocomplete: no
 * VITE_GOOGLE_MAPS_API_KEY is configured in this environment yet (the map
 * itself already degrades gracefully without one, see GoogleMapView), so
 * this is the functional fallback until one is added.
 */
function AddStoreDialog({ open, defaultCenter, onClose, onSubmit }) {
  const isMobile = useIsMobile();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, lat: String(defaultCenter?.lat ?? ''), lng: String(defaultCenter?.lng ?? '') });
      setErrors({});
    }
  }, [open, defaultCenter]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = () => {
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    onSubmit({
      name: form.name.trim(),
      address: form.address.trim(),
      lat: form.lat ? Number(form.lat) : defaultCenter?.lat ?? 0,
      lng: form.lng ? Number(form.lng) : defaultCenter?.lng ?? 0,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} disableScrollLock maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ fontWeight: 700 }}>Add hardware store</DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ pt: 0.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Store name</Typography>
            <FormTextField name="name" placeholder="e.g. ABC Hardware" value={form.name} onChange={handleChange} error={Boolean(errors.name)} helperText={errors.name || ' '} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Address</Typography>
            <FormTextField name="address" placeholder="e.g. McArthur Hwy, Tarlac City, Philippines" value={form.address} onChange={handleChange} error={Boolean(errors.address)} helperText={errors.address || ' '} />
          </Box>
          <Stack direction="row" spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Latitude</Typography>
              <FormTextField name="lat" value={form.lat} onChange={handleChange} error={Boolean(errors.lat)} helperText={errors.lat || 'From Google Maps'} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Longitude</Typography>
              <FormTextField name="lng" value={form.lng} onChange={handleChange} error={Boolean(errors.lng)} helperText={errors.lng || ' '} />
            </Box>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          sx={{ bgcolor: 'common.white', color: 'text.primary', border: '1px solid', borderColor: 'grey.300', '&:hover': { bgcolor: 'grey.50', borderColor: 'grey.300' } }}
        >
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disableElevation startIcon={<AddRoundedIcon />} sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}>
          Add store
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddStoreDialog;

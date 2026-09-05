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
import MapView from '../../components/MapView';
import { isRequired } from '../../utils/validators';
import { useIsMobile } from '../../hooks/useIsMobile';
import { colors } from '../../theme/palette';

const EMPTY_FORM = { name: '', address: '', lat: '', lng: '' };

function buildForm(store, defaultCenter) {
  if (!store) return { ...EMPTY_FORM, lat: String(defaultCenter?.lat ?? ''), lng: String(defaultCenter?.lng ?? '') };
  return { name: store.name, address: store.address, lat: String(store.lat ?? ''), lng: String(store.lng ?? '') };
}

function validate(form) {
  const errors = {};
  if (!isRequired(form.name)) errors.name = 'Store name is required';
  if (!isRequired(form.address)) errors.address = 'Address is required';
  if (form.lat && Number.isNaN(Number(form.lat))) errors.lat = 'Latitude must be a number';
  if (form.lng && Number.isNaN(Number(form.lng))) errors.lng = 'Longitude must be a number';
  return errors;
}

/**
 * Add / Edit Hardware Store dialog — Name/Address plus coordinates so the
 * store can plot on the map above (see AdminStoresPage). Coordinates are
 * set by clicking a point on the embedded map (click-to-drop-pin) — the
 * Latitude/Longitude fields below it update to match and stay editable for
 * typing/pasting an exact value directly; either way keeps the other in
 * sync since both read/write the same `form.lat`/`form.lng`.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {object|null} props.store Null for "add" mode, a store record for "edit" mode.
 * @param {{lat:number,lng:number}} props.defaultCenter Add mode's starting pin position.
 * @param {() => void} props.onClose
 * @param {(form: {name:string,address:string,lat:number,lng:number}) => void} props.onSubmit
 */
function StoreFormDialog({ open, store, defaultCenter, onClose, onSubmit }) {
  const isMobile = useIsMobile();
  const isEdit = Boolean(store);
  const [form, setForm] = useState(() => buildForm(store, defaultCenter));
  const [errors, setErrors] = useState({});
  // Where the map opens centered — captured once per open rather than
  // tracking the picked point live, so clicking a new pin location doesn't
  // recenter the view out from under the admin on every click.
  const [mapCenter, setMapCenter] = useState(() => (store ? { lat: store.lat, lng: store.lng } : defaultCenter));

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setForm(buildForm(store, defaultCenter));
      setErrors({});
      setMapCenter(store ? { lat: store.lat, lng: store.lng } : defaultCenter);
    });
  }, [open, store, defaultCenter]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleMapClick = (lat, lng) => {
    setForm((prev) => ({ ...prev, lat: String(lat.toFixed(6)), lng: String(lng.toFixed(6)) }));
    setErrors((prev) => ({ ...prev, lat: undefined, lng: undefined }));
  };

  const pickerLat = form.lat !== '' && !Number.isNaN(Number(form.lat)) ? Number(form.lat) : defaultCenter?.lat ?? 0;
  const pickerLng = form.lng !== '' && !Number.isNaN(Number(form.lng)) ? Number(form.lng) : defaultCenter?.lng ?? 0;
  const pickerMarkers = [{ id: 'picker', position: { lat: pickerLat, lng: pickerLng }, color: colors.accentBlue }];

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
    <Dialog open={open} onClose={onClose} disableScrollLock maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ fontWeight: 700 }}>{isEdit ? 'Edit hardware store' : 'Add hardware store'}</DialogTitle>
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
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Location</Typography>
            <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'grey.200' }}>
              <MapView center={mapCenter} zoom={14} markers={pickerMarkers} onMapClick={handleMapClick} height={380} />
            </Box>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.75 }}>
              Click the map to drop the pin, or type exact coordinates below.
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Latitude</Typography>
              <FormTextField name="lat" value={form.lat} onChange={handleChange} error={Boolean(errors.lat)} helperText={errors.lat || ' '} />
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
        <Button onClick={handleSubmit} variant="contained" disableElevation startIcon={isEdit ? null : <AddRoundedIcon />} sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}>
          {isEdit ? 'Save changes' : 'Add store'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default StoreFormDialog;

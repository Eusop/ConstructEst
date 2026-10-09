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
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import FormTextField from '../../components/FormTextField';
import QuotationFilePicker from './QuotationFilePicker';
import { isRequired } from '../../utils/validators';
import { useIsMobile } from '../../hooks/useIsMobile';
import { colors } from '../../theme/palette';

function buildForm(brand, unit) {
  if (!brand) return { name: '', unit, spec: '', price: '', available: true, stockQty: '' };
  return {
    name: brand.name,
    unit: brand.unit ?? unit,
    spec: brand.spec ?? '',
    price: String(brand.price ?? ''),
    available: brand.available,
    stockQty: brand.stockQty == null ? '' : String(brand.stockQty),
  };
}

function validate(form) {
  const errors = {};
  if (!isRequired(form.name)) errors.name = 'Brand name is required';
  if (!form.price || Number.isNaN(Number(form.price)) || Number(form.price) < 0) errors.price = 'Enter a valid price';
  if (form.stockQty !== '' && (Number.isNaN(Number(form.stockQty)) || Number(form.stockQty) < 0)) errors.stockQty = 'Enter 0 or more, or leave blank';
  return errors;
}

/**
 * Add / Edit Brand dialog for a store's material (Cement, CHB, Rebar, ...).
 * Sand and Gravel use BulkMaterialDialog instead, since bulk commodities have
 * no brand selection.
 */
function BrandFormDialog({ open, materialName, unit, brand, onClose, onSubmit }) {
  const isMobile = useIsMobile();
  const isEdit = Boolean(brand);
  const [form, setForm] = useState(() => buildForm(brand, unit));
  const [errors, setErrors] = useState({});
  const [quotationFile, setQuotationFile] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(buildForm(brand, unit));
      setErrors({});
      setQuotationFile(null);
    }
  }, [open, brand, unit]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = () => {
    const validationErrors = validate(form);
    // A quotation is only needed when the price is new or changed.
    const priceChanged = !isEdit || Number(form.price) !== Number(brand.price);
    if (priceChanged && !quotationFile) {
      validationErrors.quotationFile = 'A quotation is required to set or change this price';
    }
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    onSubmit(
      {
        name: form.name.trim(),
        unit: form.unit,
        spec: form.spec.trim(),
        price: Number(form.price),
        available: form.available,
        stockQty: form.stockQty === '' ? null : Number(form.stockQty),
      },
      quotationFile,
    );
  };

  return (
    <Dialog open={open} onClose={onClose} disableScrollLock maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {isEdit ? 'Edit Brand' : 'Add Brand'}
        <Typography sx={{ fontWeight: 400, fontSize: '0.85rem', color: 'text.secondary', mt: 0.25 }}>for {materialName}</Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ pt: 0.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Brand name</Typography>
              <FormTextField name="name" placeholder="e.g. ABC Cement" value={form.name} onChange={handleChange} error={Boolean(errors.name)} helperText={errors.name || ' '} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Unit</Typography>
              <FormTextField name="unit" value={form.unit} onChange={handleChange} />
            </Box>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Unit price</Typography>
              <FormTextField
                name="price"
                value={form.price}
                onChange={handleChange}
                error={Boolean(errors.price)}
                helperText={errors.price || ' '}
                slotProps={{ input: { startAdornment: <InputAdornment position="start">₱</InputAdornment> } }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
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
                  height: 56,
                  '& .MuiToggleButton-root': { border: 'none', borderRadius: 1.5, fontWeight: 600, textTransform: 'none', fontSize: '0.82rem' },
                  '& .Mui-selected': { bgcolor: '#fff!important', color: `${colors.iconGreenFg}!important` },
                }}
              >
                <ToggleButton value="available">Available</ToggleButton>
                <ToggleButton value="out">Out of stock</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Stock on hand</Typography>
              <FormTextField
                name="stockQty"
                placeholder="Leave blank if not known"
                value={form.stockQty}
                onChange={handleChange}
                error={Boolean(errors.stockQty)}
                helperText={errors.stockQty || ' '}
                slotProps={{ input: { endAdornment: <InputAdornment position="end">{form.unit}</InputAdornment> } }}
              />
            </Box>
            {/* Shown in Brand Selection, the BOM and the PDF. Shared by every
                store that sells this brand, like the name and unit. */}
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Spec</Typography>
              <FormTextField
                name="spec"
                placeholder="e.g. 16mm x 6 m"
                value={form.spec}
                onChange={handleChange}
                inputProps={{ maxLength: 150 }}
                helperText="Same for every store with this brand"
              />
            </Box>
          </Stack>

          <QuotationFilePicker
            file={quotationFile}
            onFileChange={(pickedFile) => {
              setQuotationFile(pickedFile);
              setErrors((prev) => ({ ...prev, quotationFile: undefined }));
            }}
            error={errors.quotationFile}
          />
          {isEdit && !errors.quotationFile && (
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: -1.5 }}>
              Only needed when you change the price.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          sx={{
            bgcolor: 'common.white',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'grey.300',
            '&:hover': { bgcolor: 'grey.50', borderColor: 'grey.300' },
            px: { xs: 1.25, sm: 2 },
            py: { xs: 0.5, sm: 1.5 },
            fontSize: { xs: '0.8rem', sm: '1.05rem' },
            whiteSpace: 'nowrap',
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disableElevation
          startIcon={<AddRoundedIcon />}
          sx={{
            bgcolor: colors.accentBlue,
            '&:hover': { bgcolor: colors.accentBlueDark },
            px: { xs: 1.25, sm: 2 },
            py: { xs: 0.5, sm: 1.5 },
            fontSize: { xs: '0.8rem', sm: '1.05rem' },
            whiteSpace: 'nowrap',
          }}
        >
          {isEdit ? 'Save changes' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default BrandFormDialog;

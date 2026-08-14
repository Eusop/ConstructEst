import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { MATERIAL_CATALOG } from '../data/materialCatalog';
import { colors } from '../../theme/palette';

/**
 * Checkbox picker for adding materials to the active store's catalog (see
 * requirement 9's Store -> Material step). Already-stocked materials are
 * pre-checked and locked; Sand/Gravel are flagged "no brands" since they're
 * priced directly (requirement 13).
 */
function AddMaterialsDialog({ open, alreadyStocked, onClose, onSubmit }) {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (open) setSelected([]);
  }, [open]);

  const toggle = (key) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  };

  const handleSubmit = () => {
    if (selected.length === 0) return;
    onSubmit(selected);
  };

  return (
    <Dialog open={open} onClose={onClose} disableScrollLock maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add materials to store</DialogTitle>
      <DialogContent>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 2 }}>Select which materials this store stocks.</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1 }}>
          {MATERIAL_CATALOG.map((material) => {
            const stocked = alreadyStocked.includes(material.key);
            const checked = stocked || selected.includes(material.key);
            return (
              <Box
                key={material.key}
                component="label"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.25,
                  py: 1,
                  border: '1px solid',
                  borderColor: checked ? colors.accentBlue : 'divider',
                  bgcolor: checked ? `${colors.accentBlue}0d` : 'transparent',
                  borderRadius: 2,
                  cursor: stocked ? 'default' : 'pointer',
                  opacity: stocked ? 0.6 : 1,
                }}
              >
                <Checkbox size="small" checked={checked} disabled={stocked} onChange={() => toggle(material.key)} sx={{ p: 0 }} />
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 500, flex: 1 }}>{material.name}</Typography>
                {material.bulk && <Chip label="no brands" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'grey.100', color: 'text.secondary' }} />}
                {stocked && <Chip label="added" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: colors.iconGreenBg, color: colors.iconGreenFg }} />}
              </Box>
            );
          })}
        </Box>
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
          disabled={selected.length === 0}
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
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddMaterialsDialog;

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { colors } from '../../../theme/palette';

/**
 * Centered confirmation dialog for deleting a project.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onCancel
 * @param {() => void} props.onConfirm
 */
function DeleteProjectDialog({ open, onCancel, onConfirm }) {
  return (
    <Dialog open={open} onClose={onCancel} disableScrollLock maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Delete project</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: 'text.primary' }}>
          Are you sure you want to delete this project?
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onCancel}
          sx={{
            bgcolor: 'common.white',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'grey.300',
            '&:hover': { bgcolor: 'grey.50', borderColor: 'grey.300' },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          disableElevation
          sx={{ bgcolor: colors.iconRedFg, '&:hover': { bgcolor: '#B91C1C' } }}
        >
          Yes, Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DeleteProjectDialog;

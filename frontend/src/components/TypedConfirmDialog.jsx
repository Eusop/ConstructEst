import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import { colors } from '../theme/palette';

/**
 * Confirmation dialog for destructive actions. The confirm button stays
 * disabled until the exact word is typed, which is harder to click through
 * than Yes/Cancel. Used by the project delete (ProjectsPage.jsx) and the admin
 * store delete (AdminStoresPage.jsx).
 *
 * Render with a `key` tied to the target (e.g. `key={pendingId ?? 'closed'}`)
 * so each attempt starts fresh, with no leftover text or spinner.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.title
 * @param {import('react').ReactNode} props.message
 * @param {string} [props.confirmWord]
 * @param {string} [props.confirmLabel]
 * @param {() => void} props.onCancel
 * @param {() => Promise<void>} props.onConfirm Rejecting keeps the dialog open (stops the spinner, keeps the typed text); the caller already showed the error (e.g. a toast).
 */
function TypedConfirmDialog({ open, title, message, confirmWord = 'DELETE', confirmLabel = 'Yes, Delete', onCancel, onConfirm }) {
  const [confirmText, setConfirmText] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const canConfirm = confirmText === confirmWord && !isConfirming;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setIsConfirming(true);
    try {
      await onConfirm();
    } catch {
      // The caller already showed the error (toast). Just stop the spinner so the
      // user can retry without the dialog closing.
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onClose={isConfirming ? undefined : onCancel} disableScrollLock maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        {/* component="div" because `message` isn't always inline text (the admin
            verify-user flow puts a profile block here), which can't sit inside
            DialogContentText's default <p>. */}
        <DialogContentText component="div" sx={{ color: 'text.primary', mb: 2 }}>{message}</DialogContentText>
        <DialogContentText sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 1 }}>
          Type <strong>{confirmWord}</strong> to confirm.
        </DialogContentText>
        <TextField
          autoFocus
          fullWidth
          size="small"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder={confirmWord}
          disabled={isConfirming}
        />
      </DialogContent>
      {/* On phones (`down('sm')`) the actions stack full-width, since side by
          side the confirm label ("Yes, Deactivate") wraps. `sm`+ keeps the inline row. */}
      <DialogActions
        sx={(theme) => ({
          px: 3,
          pb: 3,
          [theme.breakpoints.down('sm')]: {
            flexDirection: 'column-reverse',
            alignItems: 'stretch',
            gap: 1,
            px: 2,
            pb: 2,
            '& > :not(:first-of-type)': { ml: 0 },
          },
        })}
      >
        <Button
          onClick={onCancel}
          disabled={isConfirming}
          sx={(theme) => ({
            bgcolor: 'common.white',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'grey.300',
            '&:hover': { bgcolor: 'grey.50', borderColor: 'grey.300' },
            [theme.breakpoints.down('sm')]: { width: '100%' },
          })}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!canConfirm}
          variant="contained"
          disableElevation
          startIcon={isConfirming ? <CircularProgress size={16} color="inherit" /> : null}
          sx={(theme) => ({
            bgcolor: colors.iconRedFg,
            '&:hover': { bgcolor: '#B91C1C' },
            [theme.breakpoints.down('sm')]: { width: '100%', whiteSpace: 'nowrap' },
          })}
        >
          {isConfirming ? 'Working…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TypedConfirmDialog;

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
 * Typed-word confirmation dialog for destructive actions — the destructive
 * button stays disabled until the exact confirmation word is typed in, a
 * stronger guard than a plain Yes/Cancel dialog that's easy to click through
 * by habit. Shared between the User Module's project delete
 * (ProjectsPage.jsx) and the Admin Module's store delete
 * (AdminStoresPage.jsx).
 *
 * Render with a `key` tied to whatever's being targeted (e.g.
 * `key={pendingId ?? 'closed'}`) so each new attempt gets a fresh instance —
 * no leftover typed text or stuck spinner from a previous attempt.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.title
 * @param {import('react').ReactNode} props.message
 * @param {string} [props.confirmWord]
 * @param {string} [props.confirmLabel]
 * @param {() => void} props.onCancel
 * @param {() => Promise<void>} props.onConfirm Rejecting keeps the dialog open (stops the spinner, keeps the typed text) instead of closing — the caller is expected to have already surfaced the error (e.g. a toast).
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
      // Caller already surfaced the error (toast) — just stop spinning so
      // the user can retry without the dialog closing on them.
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onClose={isConfirming ? undefined : onCancel} disableScrollLock maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: 'text.primary', mb: 2 }}>{message}</DialogContentText>
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
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onCancel}
          disabled={isConfirming}
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
          onClick={handleConfirm}
          disabled={!canConfirm}
          variant="contained"
          disableElevation
          startIcon={isConfirming ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ bgcolor: colors.iconRedFg, '&:hover': { bgcolor: '#B91C1C' } }}
        >
          {isConfirming ? 'Working…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TypedConfirmDialog;

import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import FormTextField from '../../../components/FormTextField';
import { confirmEmailChangeRequest, requestEmailChangeRequest } from '../../../services/usersService';
import { colors } from '../../../theme/palette';

const RESEND_COOLDOWN_SECONDS = 45;

/**
 * Second step of changing the account email: the code sent to the NEW address.
 * The email only changes after the right code is entered (IT test TC-U25).
 *
 * @param {object} props
 * @param {string|null} props.email The new email waiting for its code; the dialog is open while set.
 * @param {(user: object) => void} props.onConfirmed Called with the updated user.
 * @param {() => void} props.onCancel Closes without changing the email.
 */
function EmailChangeDialog({ email, onConfirmed, onCancel }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (!email || cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [email, cooldown]);

  const handleConfirm = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.');
      return;
    }
    setIsConfirming(true);
    try {
      const { user } = await confirmEmailChangeRequest(code);
      onConfirmed(user);
    } catch (err) {
      setError(err.message || 'Could not confirm this code. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleResend = async () => {
    try {
      await requestEmailChangeRequest(email);
      setError('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err.message || 'Could not send a new code.');
    }
  };

  return (
    <Dialog open={Boolean(email)} onClose={onCancel} disableScrollLock maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Confirm your new email</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', mb: 2 }}>
          We sent a 6-digit code to <strong>{email}</strong>. Your email changes only after you enter it. Check the spam folder if you
          don&apos;t see it.
        </Typography>
        <FormTextField
          name="emailChangeCode"
          placeholder="6-digit code"
          value={code}
          onChange={(event) => {
            setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
            setError('');
          }}
          error={Boolean(error)}
          helperText={error || ' '}
          slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'one-time-code' } }}
        />
        <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
          {cooldown > 0 ? (
            `You can request a new code in ${cooldown}s.`
          ) : (
            <Link component="button" type="button" onClick={handleResend} sx={{ fontSize: 'inherit' }}>
              Send a new code
            </Link>
          )}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onCancel} sx={{ color: 'text.primary', border: '1px solid', borderColor: 'grey.300' }}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disableElevation
          disabled={isConfirming}
          sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
        >
          {isConfirming ? <CircularProgress size={18} sx={{ color: 'common.white' }} /> : 'Confirm email'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EmailChangeDialog;

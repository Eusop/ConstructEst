import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PasswordField from '../../../components/PasswordField';
import PasswordStrengthMeter from '../../../components/PasswordStrengthMeter';
import { setNewPasswordRequest } from '../../../services/authService';
import { useUser } from '../../../context/UserContext';
import { isStrongPassword, passwordsMatch, PASSWORD_RULE_MESSAGE } from '../../../utils/validators';
import { ROUTES, ADMIN_ROUTES } from '../../../routes/paths';
import { colors } from '../../../theme/palette';

const FIELD_LABEL_SX = { fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 };

/**
 * Shown right after signing in with a temporary password from an admin. The
 * user must choose their own before using the app (RequireRole sends them
 * here, and the backend blocks other requests until then).
 */
function SetNewPasswordForm() {
  const navigate = useNavigate();
  const { userName, accessRole, updateProfile, logout } = useUser();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isStrongPassword(newPassword)) {
      setError(`New password: ${PASSWORD_RULE_MESSAGE.toLowerCase()}.`);
      return;
    }
    if (!passwordsMatch(newPassword, confirmPassword)) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await setNewPasswordRequest({ newPassword });
      updateProfile({ mustChangePassword: false });
      navigate(accessRole === 'admin' ? ADMIN_ROUTES.DASHBOARD : ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      setError(err.message || 'Could not save your new password. Try again.');
      setIsSubmitting(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <Stack spacing={2.5} component="form" onSubmit={handleSubmit} noValidate>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.35rem', md: '1.6rem' }, color: 'text.primary' }}>
          Set a new password
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', mt: 0.5 }}>
          {userName ? `Hi ${userName}, you` : 'You'} signed in with a temporary password from your administrator.
          Choose your own password to continue.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ fontSize: '0.85rem' }}>{error}</Alert>}

      <Box>
        <Typography sx={FIELD_LABEL_SX}>New password</Typography>
        <PasswordField
          name="newPassword"
          autoComplete="new-password"
          showToggle
          icon={<LockRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        <PasswordStrengthMeter password={newPassword} />
      </Box>

      <Box>
        <Typography sx={FIELD_LABEL_SX}>Confirm new password</Typography>
        <PasswordField
          name="confirmPassword"
          autoComplete="new-password"
          showToggle
          icon={<LockRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </Box>

      <Button
        type="submit"
        variant="contained"
        disableElevation
        fullWidth
        disabled={isSubmitting}
        startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark }, py: 1.25 }}
      >
        Save and continue
      </Button>

      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', textAlign: 'center' }}>
        <Link component="button" type="button" onClick={handleSignOut} underline="none" sx={{ fontWeight: 600, color: colors.accentBlue }}>
          Sign out
        </Link>
      </Typography>
    </Stack>
  );
}

export default SetNewPasswordForm;

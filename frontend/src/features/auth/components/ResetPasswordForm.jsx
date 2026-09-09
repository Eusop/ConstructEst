import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PasswordField from '../../../components/PasswordField';
import PasswordStrengthMeter from '../../../components/PasswordStrengthMeter';
import { forgotPasswordRequest, resetPasswordRequest } from '../../../services/authService';
import { isValidEmail, isStrongPassword, passwordsMatch } from '../../../utils/validators';
import { ROUTES } from '../../../routes/paths';
import { colors } from '../../../theme/palette';

const RESEND_COOLDOWN_SECONDS = 45; // matches auth.controller.js
const FIELD_LABEL_SX = { fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 };

/**
 * Forgot-password flow, both steps in one component: ask for the email, then
 * enter the emailed code plus a new password. Modelled on VerifyEmailForm,
 * which solves the same problem for signup verification.
 *
 * The "request" step deliberately shows the same confirmation whether or not
 * the address is registered — the backend answers identically too (see
 * forgotPassword), because anything that distinguishes them turns this into
 * a way to discover which emails have accounts.
 */
function ResetPasswordForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 'request' = asking for the code, 'reset' = code + new password.
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleRequest = async (event) => {
    event?.preventDefault();
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const { message } = await forgotPasswordRequest({ email });
      setNotice(message);
      setStep('reset');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err.message || 'Could not send the code. Try again in a moment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (!passwordsMatch(newPassword, confirmPassword)) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await resetPasswordRequest({ email, code, newPassword });
      // Confirmed on this page rather than by redirecting with a message in
      // navigation state: the login form has no way to display one, so that
      // message would just vanish and the reset would look like it did
      // nothing.
      setStep('done');
    } catch (err) {
      setError(err.message || 'Could not reset your password. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'done') {
    return (
      <Stack spacing={2.5}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.35rem', md: '1.6rem' }, color: 'text.primary' }}>
            Password updated
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', mt: 0.5 }}>
            You can now sign in with your new password. We have emailed you a confirmation.
          </Typography>
        </Box>
        <Button
          onClick={() => navigate(ROUTES.LOGIN)}
          variant="contained"
          disableElevation
          fullWidth
          sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark }, py: 1.25 }}
        >
          Go to sign in
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5} component="form" onSubmit={step === 'request' ? handleRequest : handleReset} noValidate>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.35rem', md: '1.6rem' }, color: 'text.primary' }}>
          Reset your password
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', mt: 0.5 }}>
          {step === 'request'
            ? 'Enter the email you signed up with and we will send you a 6-digit code.'
            : `Enter the code sent to ${email} and choose a new password.`}
        </Typography>
      </Box>

      {notice && step === 'reset' && <Alert severity="info" sx={{ fontSize: '0.85rem' }}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ fontSize: '0.85rem' }}>{error}</Alert>}

      {step === 'request' ? (
        <Box>
          <Typography sx={FIELD_LABEL_SX}>Email</Typography>
          <TextField
            fullWidth
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            slotProps={{
              input: {
                startAdornment: <MailOutlineRoundedIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />,
              },
            }}
          />
        </Box>
      ) : (
        <>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>6-digit code</Typography>
            <TextField
              fullWidth
              value={code}
              // Digits only, capped at 6, so the field can't hold something
              // the backend would reject outright.
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputProps={{ inputMode: 'numeric', maxLength: 6, style: { letterSpacing: '0.4em', fontWeight: 700 } }}
            />
          </Box>

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
        </>
      )}

      <Button
        type="submit"
        variant="contained"
        disableElevation
        fullWidth
        disabled={isSubmitting}
        startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark }, py: 1.25 }}
      >
        {step === 'request' ? 'Send reset code' : 'Reset password'}
      </Button>

      {step === 'reset' && (
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', textAlign: 'center' }}>
          Didn&apos;t get it?{' '}
          <Link
            component="button"
            type="button"
            disabled={cooldown > 0 || isSubmitting}
            onClick={handleRequest}
            underline="none"
            sx={{ fontWeight: 600, color: cooldown > 0 ? 'text.disabled' : colors.accentBlue }}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send another code'}
          </Link>
        </Typography>
      )}

      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', textAlign: 'center' }}>
        <Link component={RouterLink} to={ROUTES.LOGIN} underline="none" sx={{ fontWeight: 600, color: colors.accentBlue }}>
          Back to sign in
        </Link>
      </Typography>
    </Stack>
  );
}

export default ResetPasswordForm;

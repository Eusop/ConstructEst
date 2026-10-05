import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded';
import FormTextField from '../../../components/FormTextField';
import { verifyEmailRequest, resendCodeRequest } from '../../../services/authService';
import { useToast } from '../../../context/ToastContext';
import { ROUTES } from '../../../routes/paths';
import { colors } from '../../../theme/palette';

const RESEND_COOLDOWN_SECONDS = 45;

// Error codes meaning this address is already past this step: send the user to
// Login with an explanation instead of leaving them stuck on a code that can't work.
const REDIRECT_TO_LOGIN_CODES = new Set(['ALREADY_VERIFIED', 'ACCOUNT_NOT_FOUND']);

/**
 * Verify Email form: type the 6-digit code emailed at registration (or after a
 * login that returned EMAIL_NOT_VERIFIED, see LoginForm.jsx). The email comes
 * from router `state`, not a query param, so it stays out of the URL and
 * history. State doesn't survive a hard refresh, so the field is then blank and
 * editable. It doesn't create a session either way (same as SignUpForm), since
 * an admin still has to approve the account (see login in auth.controller.js).
 */
function VerifyEmailForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [email, setEmail] = useState(location.state?.email ?? '');
  const userId = location.state?.userId ?? null;
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!cooldownEndsAt) return undefined;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cooldownEndsAt]);

  const handleCodeChange = (event) => {
    setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim()) {
      showToast('Enter the email you registered with.');
      return;
    }
    if (code.length !== 6) {
      showToast('Enter the 6-digit code.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Admin-created accounts are already approved, so the server says "You can now sign in".
      const result = await verifyEmailRequest({ email: email.trim(), code });
      showToast(result?.message || 'Email verified! An admin will review your account next.', 'success');
      navigate(ROUTES.LOGIN);
    } catch (error) {
      if (REDIRECT_TO_LOGIN_CODES.has(error.code)) {
        showToast(error.message, error.code === 'ALREADY_VERIFIED' ? 'success' : 'error');
        navigate(ROUTES.LOGIN);
      } else {
        showToast(error.message || 'Could not verify this code. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      showToast('Enter the email you registered with.');
      return;
    }
    setIsResending(true);
    try {
      const response = await resendCodeRequest({ email: email.trim() });
      showToast(response?.message || 'A new code has been sent to your email.', 'success');
      setCooldownEndsAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
    } catch (error) {
      if (REDIRECT_TO_LOGIN_CODES.has(error.code)) {
        showToast(error.message, error.code === 'ALREADY_VERIFIED' ? 'success' : 'error');
        navigate(ROUTES.LOGIN);
      } else if (error.code === 'RESEND_COOLDOWN') {
        // Defensive: the button should already be disabled, but the server's
        // cooldown is the source of truth (e.g. a second tab).
        showToast(error.message);
        setCooldownEndsAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
      } else {
        showToast(error.message || 'Could not resend the code. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const resendDisabled = isResending || secondsLeft > 0;

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 0.5 }}>
        <MarkEmailReadRoundedIcon sx={{ color: colors.accentBlue }} />
        <Typography component="h1" sx={{ fontWeight: 800, fontSize: '1.5rem', color: 'text.primary' }}>
          Verify your email
        </Typography>
      </Stack>
      <Typography sx={{ color: 'primary.main', fontSize: '0.9rem', mb: userId ? 2 : 3 }}>
        Enter the 6-digit code we sent to your email address.
      </Typography>

      {/* Only right after sign up (router state). The same ID is in the email. */}
      {userId && (
        <Box sx={{ bgcolor: colors.iconBlueBg, borderRadius: 2, px: 2, py: 1.5, mb: 3 }}>
          <Typography sx={{ fontSize: '0.9rem', color: 'text.primary' }}>
            Your User ID is <Box component="strong" data-testid="new-user-id" sx={{ fontSize: '1.05rem' }}>{userId}</Box>
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mt: 0.25 }}>
            Keep it to sign in, or sign in with your email.
          </Typography>
        </Box>
      )}

      <Stack spacing={2.5}>
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>
            Email
          </Typography>
          <FormTextField
            type="email"
            placeholder="m.reyes@email.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>
            Verification code
          </Typography>
          <FormTextField
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={handleCodeChange}
            slotProps={{ input: { sx: { letterSpacing: 6, fontWeight: 700 } } }}
          />
        </Box>

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disableElevation
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
        >
          {isSubmitting ? 'Verifying…' : 'Verify'}
        </Button>

        <Typography sx={{ textAlign: 'center', color: 'text.secondary', fontSize: '0.9rem' }}>
          Didn&apos;t get it?{' '}
          {resendDisabled ? (
            <Typography component="span" sx={{ color: 'text.disabled', fontWeight: 700 }}>
              Resend code{secondsLeft > 0 ? ` (${secondsLeft}s)` : '…'}
            </Typography>
          ) : (
            <Link
              component="button"
              type="button"
              onClick={handleResend}
              underline="none"
              sx={{ color: 'primary.main', fontWeight: 700 }}
            >
              Resend code
            </Link>
          )}
        </Typography>
      </Stack>
    </Box>
  );
}

export default VerifyEmailForm;

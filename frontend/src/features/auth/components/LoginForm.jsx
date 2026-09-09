import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import FormTextField from '../../../components/FormTextField';
import PasswordField from '../../../components/PasswordField';
import { loginRequest } from '../../../services/authService';
import { useUser } from '../../../context/UserContext';
import { useToast } from '../../../context/ToastContext';
import { ROUTES, ADMIN_ROUTES } from '../../../routes/paths';
import { colors } from '../../../theme/palette';
import { isRequired } from '../../../utils/validators';

const INITIAL_FORM = { identifier: '', password: '' };

function validate(form) {
  const errors = {};
  if (!isRequired(form.identifier)) errors.identifier = 'Email or Employee ID is required';
  if (!isRequired(form.password)) errors.password = 'Password is required';
  return errors;
}

/**
 * Sign in form: "Email or Employee ID" + password fields, a "Keep me signed in"
 * preference, the primary Sign in action, and the "Create an account" prompt.
 *
 * Backed by the real backend (see services/authService.js) — the returned
 * account's `accessRole` decides where sign-in lands: `admin` accounts go
 * straight to the Admin Module's dashboard, everyone else to the regular
 * Dashboard, so an admin login never ends up in the User Module.
 */
function LoginForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingApprovalOpen, setPendingApprovalOpen] = useState(false);
  const navigate = useNavigate();
  const { setCurrentUser, updateProfile } = useUser();
  const { showToast } = useToast();

  // Computed live from `form` every render (not stored in state) so a
  // shown error updates as you keep typing, rather than freezing until the
  // next submit click — see SignUpForm.jsx for the same pattern.
  const errors = validate(form);
  // Shows the instant there's content, not gated on blur alone — a browser
  // autofilling saved login credentials never fires a real blur event
  // (see SignUpForm.jsx for the same fix and fuller explanation).
  const showError = (field) => {
    const hasContent = form[field]?.trim().length > 0;
    return Boolean(errors[field]) && (hasContent || touched[field] || submitAttempted);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (event) => {
    setTouched((prev) => ({ ...prev, [event.target.name]: true }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitAttempted(true);
    if (Object.keys(errors).length > 0) {
      showToast('Please fix the highlighted fields before continuing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await loginRequest({ ...form, keepSignedIn });
      setCurrentUser(user.userName, user.accessRole);
      updateProfile({ id: user.id, employeeId: user.employeeId, email: user.email, avatarUrl: user.avatarUrl });
      navigate(user.accessRole === 'admin' ? ADMIN_ROUTES.DASHBOARD : ROUTES.DASHBOARD);
    } catch (error) {
      // Email confirmation is the earlier of the two gates (see
      // auth.controller.js's login — it checks email_verified_at before
      // is_verified), so it's checked first here too: sent straight to
      // Verify Email with the account's real address (error.email — not
      // necessarily what was typed here, since the identifier field accepts
      // either the email or the Employee ID) rather than a toast, since
      // nothing else on this page can fix it. Pending approval instead gets
      // its own overlay, not the usual toast — it's not really "wrong
      // credentials" (the toast's implication), and it's worth more than a
      // few seconds on screen since it explains why nothing else here will
      // work yet.
      if (error.code === 'EMAIL_NOT_VERIFIED') {
        navigate(ROUTES.VERIFY_EMAIL, { state: { email: error.email || form.identifier } });
      } else if (error.code === 'PENDING_VERIFICATION') {
        setPendingApprovalOpen(true);
      } else {
        showToast(error.message || 'Could not sign in. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography component="h1" sx={{ fontWeight: 800, fontSize: '1.5rem', color: 'text.primary', mb: 0.5 }}>
        Welcome back
      </Typography>
      <Typography sx={{ color: 'primary.main', fontSize: '0.9rem', mb: 3 }}>
        Sign in to your ConstructEst account.
      </Typography>

      <Stack spacing={2.5}>
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>
            Email or Employee ID
          </Typography>
          <FormTextField
            name="identifier"
            placeholder="mreyes"
            autoComplete="username"
            icon={<PersonRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
            value={form.identifier}
            onChange={handleChange}
            onBlur={handleBlur}
            error={Boolean(showError('identifier'))}
            helperText={showError('identifier') || ' '}
          />
        </Box>

        <Box>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary' }}>
              Password
            </Typography>
            {/* Was href="#" with nothing behind it — no route, no page, no
                endpoint. Now goes to the real reset flow, carrying whatever
                was already typed so it doesn't have to be retyped. */}
            <Link
              component={RouterLink}
              to={`${ROUTES.RESET_PASSWORD}${form.identifier.includes('@') ? `?email=${encodeURIComponent(form.identifier)}` : ''}`}
              underline="none"
              sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.8rem' }}
            >
              Forgot password?
            </Link>
          </Stack>
          <PasswordField
            name="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            showToggle
            icon={<LockRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
            value={form.password}
            onChange={handleChange}
            onBlur={handleBlur}
            error={Boolean(showError('password'))}
            helperText={showError('password') || ' '}
          />
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={keepSignedIn}
              onChange={(event) => setKeepSignedIn(event.target.checked)}
              sx={{ py: 0 }}
            />
          }
          label={<Typography sx={{ fontSize: '0.9rem', color: 'text.primary' }}>Keep me signed in</Typography>}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disableElevation
          disabled={isSubmitting}
          sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
        >
          Sign in
        </Button>

        <Divider>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>or</Typography>
        </Divider>

        <Typography sx={{ textAlign: 'center', color: 'text.secondary', fontSize: '0.9rem' }}>
          New to ConstructEst?{' '}
          <Link
            component={RouterLink}
            to={ROUTES.SIGNUP}
            underline="none"
            sx={{ color: 'primary.main', fontWeight: 700 }}
          >
            Create an account
          </Link>
        </Typography>
      </Stack>

      <Dialog open={pendingApprovalOpen} onClose={() => setPendingApprovalOpen(false)} disableScrollLock maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.25, fontWeight: 700 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: colors.iconOrangeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HourglassTopRoundedIcon sx={{ color: colors.iconOrangeFg, fontSize: 18 }} />
          </Box>
          Account pending approval
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.primary' }}>
            Your account has been created, but an admin needs to review and approve it before you can sign in.
            There&apos;s nothing more to do on your end — try again once you&apos;ve been notified it&apos;s approved.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setPendingApprovalOpen(false)}
            variant="contained"
            disableElevation
            sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
          >
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default LoginForm;

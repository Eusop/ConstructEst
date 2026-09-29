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
 * Sign in form: "Email or Employee ID" and password, a "Keep me signed in"
 * option, the Sign in action and the "Create an account" prompt. Uses the real
 * backend (services/authService.js). The account's `accessRole` decides where
 * sign-in lands: `admin` goes to the Admin Module dashboard, everyone else to
 * the regular Dashboard.
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

  // Computed from `form` on every render (not stored in state), so an error
  // updates while typing (same pattern as SignUpForm.jsx).
  const errors = validate(form);
  // Shown as soon as there is content, not only on blur, because browser
  // autofill never fires a blur (see SignUpForm.jsx).
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
      // Email confirmation is the earlier gate (auth.controller.js login checks
      // email_verified_at before is_verified), so it is checked first. It goes
      // straight to Verify Email with the account's real address (error.email,
      // since the identifier can be an Employee ID) instead of a toast, because
      // nothing else on this page can fix it. Pending approval gets its own
      // overlay instead of the usual toast, since it isn't a wrong-credentials
      // case and needs longer on screen to explain why login won't work yet.
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
            {/* Goes to the real reset flow, carrying whatever was already typed. */}
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

        <Box>
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
          {/* New tab (plain href), like Sign Up, so the login form isn't lost. */}
          <Typography sx={{ textAlign: 'center', color: 'text.secondary', fontSize: '0.78rem', mt: 1.25 }}>
            By signing in, you agree to our{' '}
            <Link href={ROUTES.TERMS} target="_blank" rel="noopener noreferrer" underline="none" sx={{ color: 'primary.main', fontWeight: 600 }}>
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href={ROUTES.PRIVACY} target="_blank" rel="noopener noreferrer" underline="none" sx={{ color: 'primary.main', fontWeight: 600 }}>
              Privacy Policy
            </Link>
            .
          </Typography>
        </Box>

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

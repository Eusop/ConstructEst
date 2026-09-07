import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import FormTextField from '../../../components/FormTextField';
import PasswordField from '../../../components/PasswordField';
import PasswordStrengthMeter from '../../../components/PasswordStrengthMeter';
import { signUpRequest, checkAvailability } from '../../../services/authService';
import { useToast } from '../../../context/ToastContext';
import { ROUTES } from '../../../routes/paths';
import { colors } from '../../../theme/palette';
import { isRequired, passwordsMatch, isValidEmail, isValidName, isValidEmployeeId, getEmployeeIdHint, isStrongPassword } from '../../../utils/validators';

// How long to wait after the last keystroke before pinging the server for
// "is this already taken" — long enough that normal typing never triggers a
// request per keystroke, short enough that the check still feels immediate
// once you pause.
const AVAILABILITY_DEBOUNCE_MS = 500;

const IDLE_AVAILABILITY = { checking: false, taken: false };

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  employeeId: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function validate(form) {
  const errors = {};

  if (!isRequired(form.firstName)) {
    errors.firstName = 'First name is required';
  } else if (!isValidName(form.firstName)) {
    errors.firstName = 'Must start with a letter and be at least 2 characters';
  }

  if (!isRequired(form.lastName)) {
    errors.lastName = 'Last name is required';
  } else if (!isValidName(form.lastName)) {
    errors.lastName = 'Must start with a letter and be at least 2 characters';
  }

  if (!isRequired(form.employeeId)) {
    errors.employeeId = 'Employee ID is required';
  } else if (!isValidEmployeeId(form.employeeId)) {
    errors.employeeId = getEmployeeIdHint(form.employeeId) ?? '3–20 characters: start with a letter, then letters, numbers, or _ . -';
  }

  if (!isRequired(form.email)) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Enter a valid email address';
  }

  if (!isRequired(form.password)) {
    errors.password = 'Password is required';
  } else if (!isStrongPassword(form.password)) {
    errors.password = 'Must be at least 6 characters';
  }

  if (!isRequired(form.confirmPassword)) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (!passwordsMatch(form.password, form.confirmPassword)) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
}

/**
 * Sign up form: name / Employee ID / email / password fields, a Terms of
 * Service & Privacy Policy agreement, and the primary
 * Create account action.
 *
 * Validation is live, not just on submit: `errors` is recomputed from
 * `validate(form)` on every render (not stored in state), so a field's
 * message updates immediately as you keep typing. It's only *shown* once
 * that field has been blurred at least once (`touched`) or a submit was
 * attempted — matching the same pattern already used for the New Project
 * form (see NewProjectPage.jsx) — so nothing turns red while you're still
 * in the middle of typing it for the first time, but once shown, it stays
 * live-updated rather than freezing until the next submit click.
 *
 * Backed by the real backend (see services/authService.js). Submitting
 * creates the account, but doesn't log it in — new accounts start
 * unverified/inactive until an admin approves them (see the Admin Module's
 * User Management page), so this redirects to Login with an explanatory
 * toast instead of the Dashboard.
 */
function SignUpForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [agreeToTerms, setAgreeToTerms] = useState(true);
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Live "is this already taken" state for the two unique fields — see the
  // debounced effects below. Distinct from `errors` (which is derived
  // synchronously from `form` every render) since these come from an async
  // server round-trip.
  const [emailStatus, setEmailStatus] = useState(IDLE_AVAILABILITY);
  const [employeeIdStatus, setEmployeeIdStatus] = useState(IDLE_AVAILABILITY);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const errors = validate(form);

  // Only pings the server once the field's own format is already valid —
  // no point checking availability of something that's going to fail sync
  // validation anyway. Editing the field again immediately clears any prior
  // "taken" result (via the cleanup below re-running before the new timer
  // fires) rather than leaving a stale result on screen while the new value
  // is still being typed.
  useEffect(() => {
    if (!isValidEmail(form.email)) {
      // Deferred a tick (see MapView.jsx for the same fix) rather than
      // setting state synchronously in the effect body.
      queueMicrotask(() => setEmailStatus(IDLE_AVAILABILITY));
      return undefined;
    }
    queueMicrotask(() => setEmailStatus({ checking: true, taken: false }));
    const email = form.email;
    const timer = setTimeout(() => {
      checkAvailability('email', email)
        .then(({ available }) => setEmailStatus({ checking: false, taken: !available }))
        .catch(() => setEmailStatus(IDLE_AVAILABILITY));
    }, AVAILABILITY_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [form.email]);

  useEffect(() => {
    if (!isValidEmployeeId(form.employeeId)) {
      queueMicrotask(() => setEmployeeIdStatus(IDLE_AVAILABILITY));
      return undefined;
    }
    queueMicrotask(() => setEmployeeIdStatus({ checking: true, taken: false }));
    const employeeId = form.employeeId;
    const timer = setTimeout(() => {
      checkAvailability('employeeId', employeeId)
        .then(({ available }) => setEmployeeIdStatus({ checking: false, taken: !available }))
        .catch(() => setEmployeeIdStatus(IDLE_AVAILABILITY));
    }, AVAILABILITY_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [form.employeeId]);

  // Shows the instant there's actual (invalid) content — not gated on blur
  // alone, since a browser autofilling First/Last Name never fires a real
  // blur event, which meant the error could never appear at all for an
  // autofilled field even though the underlying state was correct. Still
  // gated on touched/submitAttempted for the "still empty" case, so a
  // fresh, untouched field doesn't show "required" the moment the page loads.
  const showError = (field) => {
    const hasContent = form[field]?.trim().length > 0;
    return Boolean(errors[field]) && (hasContent || touched[field] || submitAttempted);
  };

  // A field's effective error merges its sync validation with the async
  // "already taken" result — same display slot, same `showError` gating.
  const emailError = errors.email || (emailStatus.taken ? 'This email is already registered' : undefined);
  const employeeIdError = errors.employeeId || (employeeIdStatus.taken ? 'This Employee ID is already taken' : undefined);
  const showEmailError = (Boolean(errors.email) || emailStatus.taken) && (form.email.trim().length > 0 || touched.email || submitAttempted);
  const showEmployeeIdError = (Boolean(errors.employeeId) || employeeIdStatus.taken) && (form.employeeId.trim().length > 0 || touched.employeeId || submitAttempted);
  // No "touched" gating needed here (unlike the text fields above) — the
  // checkbox starts checked, so this can only ever become true from a
  // deliberate uncheck, never on page load.
  const agreeError = agreeToTerms ? '' : 'You must agree to the Terms of Service and Privacy Policy to continue';

  const hasBlockingErrors =
    Object.keys(errors).length > 0 || emailStatus.taken || employeeIdStatus.taken || emailStatus.checking || employeeIdStatus.checking || !agreeToTerms;

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
    // Defense in depth — the button is already disabled whenever
    // `hasBlockingErrors` is true, but this guards direct form submission
    // (e.g. pressing Enter) the same way.
    if (hasBlockingErrors) {
      showToast('Please fix the highlighted fields before continuing.');
      return;
    }

    setIsSubmitting(true);
    try {
      // No session is created here — the new account needs to clear two
      // gates before it can log in: confirming this email address (next),
      // then an admin's approval (see
      // backend/src/controllers/auth.controller.js's register/login). Send
      // them to Verify Email with the address they just typed, not Login.
      await signUpRequest(form);
      showToast('Account created — check your email for a verification code.', 'success');
      navigate(ROUTES.VERIFY_EMAIL, { state: { email: form.email } });
    } catch (error) {
      showToast(error.message || 'Could not create your account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography component="h1" sx={{ fontWeight: 800, fontSize: '1.5rem', color: 'text.primary', mb: 0.5 }}>
        Create account
      </Typography>
      <Typography sx={{ color: 'primary.main', fontSize: '0.9rem', mb: 3 }}>
        Fill in your details to get started.
      </Typography>

      <Stack spacing={2.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>
              First name
            </Typography>
            <FormTextField
              name="firstName"
              placeholder="Marco"
              autoComplete="given-name"
              value={form.firstName}
              onChange={handleChange}
              onBlur={handleBlur}
              error={Boolean(showError('firstName'))}
              helperText={showError('firstName') || ' '}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>
              Last name
            </Typography>
            <FormTextField
              name="lastName"
              placeholder="Reyes"
              autoComplete="family-name"
              value={form.lastName}
              onChange={handleChange}
              onBlur={handleBlur}
              error={Boolean(showError('lastName'))}
              helperText={showError('lastName') || ' '}
            />
          </Box>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.75 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary' }}>
                Employee ID
              </Typography>
              {employeeIdStatus.checking && <CircularProgress size={12} sx={{ color: 'text.disabled' }} />}
            </Stack>
            <FormTextField
              name="employeeId"
              placeholder="mreyes"
              autoComplete="username"
              value={form.employeeId}
              onChange={handleChange}
              onBlur={handleBlur}
              error={Boolean(showEmployeeIdError)}
              helperText={(showEmployeeIdError && employeeIdError) || ' '}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.75 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary' }}>
                Email
              </Typography>
              {emailStatus.checking && <CircularProgress size={12} sx={{ color: 'text.disabled' }} />}
            </Stack>
            <FormTextField
              name="email"
              type="email"
              placeholder="m.reyes@email.com"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={Boolean(showEmailError)}
              helperText={(showEmailError && emailError) || ' '}
            />
          </Box>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>
              Password
            </Typography>
            <PasswordField
              name="password"
              placeholder="Password"
              autoComplete="new-password"
              icon={<LockRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={Boolean(showError('password'))}
              helperText={showError('password') || ' '}
            />
            <PasswordStrengthMeter password={form.password} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>
              Confirm password
            </Typography>
            <PasswordField
              name="confirmPassword"
              placeholder="Confirm password"
              autoComplete="new-password"
              icon={<LockRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
              value={form.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              error={Boolean(showError('confirmPassword'))}
              helperText={showError('confirmPassword') || ' '}
            />
          </Box>
        </Stack>

        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={agreeToTerms}
                onChange={(event) => setAgreeToTerms(event.target.checked)}
                sx={{ py: 0 }}
              />
            }
            label={
              <Typography sx={{ fontSize: '0.9rem', color: 'text.primary' }}>
                I agree to the{' '}
                {/* Plain href (new tab), not a router Link — this shouldn't
                    navigate away from (and lose) an in-progress sign-up form. */}
                <Link href={ROUTES.TERMS} target="_blank" rel="noopener noreferrer" underline="none" sx={{ color: 'primary.main', fontWeight: 600 }}>
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href={ROUTES.PRIVACY} target="_blank" rel="noopener noreferrer" underline="none" sx={{ color: 'primary.main', fontWeight: 600 }}>
                  Privacy Policy
                </Link>
                .
              </Typography>
            }
          />
          <Typography sx={{ color: 'error.main', fontSize: '0.75rem', minHeight: 18, mt: 0.25, ml: 1.75 }}>
            {agreeError || ' '}
          </Typography>
        </Box>

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disableElevation
          disabled={isSubmitting || hasBlockingErrors}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </Stack>
    </Box>
  );
}

export default SignUpForm;

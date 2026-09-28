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
import { isRequired, passwordsMatch, isValidEmail, isValidName, isValidEmployeeId, getEmployeeIdHint, isStrongPassword, PASSWORD_RULE_MESSAGE } from '../../../utils/validators';

// How long to wait after the last keystroke before checking if an email or
// Employee ID is taken: long enough to skip a request per keystroke, short
// enough to feel immediate.
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
    errors.password = PASSWORD_RULE_MESSAGE;
  }

  if (!isRequired(form.confirmPassword)) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (!passwordsMatch(form.password, form.confirmPassword)) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
}

/**
 * Sign up form: name, Employee ID, email and password fields, a Terms and
 * Privacy agreement, and the Create account action. Validation is live:
 * `errors` is recomputed from `validate(form)` on every render, but a field's
 * message only shows after it has been blurred once (`touched`) or a submit was
 * attempted (same as NewProjectPage.jsx), so nothing turns red while typing the
 * first time. Uses the real backend (services/authService.js). Submitting
 * creates the account but doesn't log it in: new accounts stay unverified and
 * inactive until an admin approves them, so it redirects to Login with a toast.
 */
function SignUpForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [agreeToTerms, setAgreeToTerms] = useState(true);
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Live "already taken" state for the two unique fields (see the debounced
  // effects below). Separate from `errors`, which is derived synchronously,
  // since these come from a server round-trip.
  const [emailStatus, setEmailStatus] = useState(IDLE_AVAILABILITY);
  const [employeeIdStatus, setEmployeeIdStatus] = useState(IDLE_AVAILABILITY);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const errors = validate(form);

  // Only checks the server once the field's format is valid. Editing the field
  // clears the old "taken" result (the cleanup runs before the new timer), so no
  // stale result stays while typing.
  useEffect(() => {
    if (!isValidEmail(form.email)) {
      // Deferred a tick (see MapView.jsx) instead of setting state in the effect body.
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

  // Shown as soon as there is invalid content, not only on blur, because browser
  // autofill of First/Last Name never fires a blur. Still gated on
  // touched/submitAttempted for the "empty" case, so a fresh field doesn't say
  // "required" on page load.
  const showError = (field) => {
    const hasContent = form[field]?.trim().length > 0;
    // Returns the message (or '') so it works as both the error flag and the helper text.
    return errors[field] && (hasContent || touched[field] || submitAttempted) ? errors[field] : '';
  };

  // A field's effective error merges its sync validation with the async "already
  // taken" result, in the same slot and with the same `showError` gating.
  const emailError = errors.email || (emailStatus.taken ? 'This email is already registered' : undefined);
  const employeeIdError = errors.employeeId || (employeeIdStatus.taken ? 'This Employee ID is already taken' : undefined);
  const showEmailError = (Boolean(errors.email) || emailStatus.taken) && (form.email.trim().length > 0 || touched.email || submitAttempted);
  const showEmployeeIdError = (Boolean(errors.employeeId) || employeeIdStatus.taken) && (form.employeeId.trim().length > 0 || touched.employeeId || submitAttempted);
  // No "touched" gating: the checkbox starts checked, so this can only become
  // true from a deliberate uncheck.
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
    // Defense in depth: the button is already disabled when `hasBlockingErrors`,
    // but this also guards direct submission (e.g. pressing Enter).
    if (hasBlockingErrors) {
      showToast('Please fix the highlighted fields before continuing.');
      return;
    }

    setIsSubmitting(true);
    try {
      // No session yet: the account must confirm this email (next), then get
      // admin approval (see auth.controller.js register/login). Go to Verify
      // Email with the address just typed, not Login.
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
              // Sora renders this placeholder ~14% wider than Roboto did, so a small
              // negative letter-spacing keeps it fitting the icon-narrowed field
              // without shrinking the text.
              sx={{ '& .MuiOutlinedInput-input': { letterSpacing: '-0.05em' } }}
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
                {/* Plain href (new tab), not a router Link, so it doesn't leave and
                    lose the sign-up form. */}
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

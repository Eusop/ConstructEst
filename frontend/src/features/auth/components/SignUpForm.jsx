import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import FormTextField from '../../../components/FormTextField';
import PasswordField from '../../../components/PasswordField';
import PasswordStrengthMeter from '../../../components/PasswordStrengthMeter';
import { signUpRequest } from '../../../services/authService';
import { useToast } from '../../../context/ToastContext';
import { ROUTES } from '../../../routes/paths';
import { colors } from '../../../theme/palette';
import { isRequired, passwordsMatch, isValidEmail, isValidName, isValidEmployeeId, getEmployeeIdHint, isStrongPassword } from '../../../utils/validators';

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
    errors.password = '8–16 characters with uppercase, lowercase, a number, and a special character';
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
  const [agreeError, setAgreeError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const errors = validate(form);
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
    const termsError = agreeToTerms ? '' : 'You must agree to continue';
    setAgreeError(termsError);
    if (Object.keys(errors).length > 0 || termsError) {
      showToast('Please fix the highlighted fields before continuing.');
      return;
    }

    setIsSubmitting(true);
    try {
      // No session is created here — the new account is unverified until an
      // admin approves it (see backend/src/controllers/auth.controller.js's
      // register), so there's nothing to log into yet. Send them to Login
      // instead of the Dashboard, with a toast explaining why.
      await signUpRequest(form);
      showToast('Account created — an admin will verify it before you can sign in.', 'success');
      navigate(ROUTES.LOGIN);
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
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>
              Employee ID
            </Typography>
            <FormTextField
              name="employeeId"
              placeholder="mreyes"
              autoComplete="username"
              value={form.employeeId}
              onChange={handleChange}
              onBlur={handleBlur}
              error={Boolean(showError('employeeId'))}
              helperText={showError('employeeId') || ' '}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>
              Email
            </Typography>
            <FormTextField
              name="email"
              type="email"
              placeholder="m.reyes@email.com"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={Boolean(showError('email'))}
              helperText={showError('email') || ' '}
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
                onChange={(event) => {
                  setAgreeToTerms(event.target.checked);
                  setAgreeError('');
                }}
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
          disabled={isSubmitting}
          sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
        >
          Create account
        </Button>
      </Stack>
    </Box>
  );
}

export default SignUpForm;

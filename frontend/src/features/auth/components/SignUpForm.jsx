import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import FormTextField from '../../../components/FormTextField';
import PasswordField from '../../../components/PasswordField';
import { signUpRequest } from '../../../services/authService';
import { useUser } from '../../../context/UserContext';
import { ROUTES } from '../../../routes/paths';
import { colors } from '../../../theme/palette';
import { isRequired, minLength, passwordsMatch, isValidEmail } from '../../../utils/validators';

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  userId: '',
  email: '',
  prcLicense: '',
  password: '',
  confirmPassword: '',
};

function validate(form) {
  const errors = {};

  if (!isRequired(form.firstName)) errors.firstName = 'First name is required';
  if (!isRequired(form.lastName)) errors.lastName = 'Last name is required';

  if (!isRequired(form.userId)) {
    errors.userId = 'User ID is required';
  } else if (!minLength(form.userId, 3)) {
    errors.userId = 'User ID must be at least 3 characters';
  }

  if (!isRequired(form.email)) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Enter a valid email address';
  }

  if (!isRequired(form.password)) {
    errors.password = 'Password is required';
  } else if (!minLength(form.password, 6)) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (!isRequired(form.confirmPassword)) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (!passwordsMatch(form.password, form.confirmPassword)) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
}

/**
 * Sign up form: name / User ID / email / optional PRC license / password
 * fields, a Terms of Service & Privacy Policy agreement, and the primary
 * Create account action.
 *
 * Frontend-only for now — submitting validates, calls the placeholder auth
 * service (see services/authService.js), and mock-navigates to the Dashboard
 * as if the account were created. No real account is created, so wiring up
 * a real backend later won't require changing this component.
 */
function SignUpForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [agreeToTerms, setAgreeToTerms] = useState(true);
  const [errors, setErrors] = useState({});
  const [agreeError, setAgreeError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { setCurrentUser, updateProfile } = useUser();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validate(form);
    const termsError = agreeToTerms ? '' : 'You must agree to continue';
    setErrors(validationErrors);
    setAgreeError(termsError);
    if (Object.keys(validationErrors).length > 0 || termsError) return;

    setIsSubmitting(true);
    try {
      await signUpRequest(form);
      setCurrentUser(`${form.firstName} ${form.lastName}`.trim());
      updateProfile({ username: form.userId, email: form.email });
      navigate(ROUTES.DASHBOARD);
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
              error={Boolean(errors.firstName)}
              helperText={errors.firstName || ' '}
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
              error={Boolean(errors.lastName)}
              helperText={errors.lastName || ' '}
            />
          </Box>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>
              User ID
            </Typography>
            <FormTextField
              name="userId"
              placeholder="mreyes"
              autoComplete="username"
              value={form.userId}
              onChange={handleChange}
              error={Boolean(errors.userId)}
              helperText={errors.userId || ' '}
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
              error={Boolean(errors.email)}
              helperText={errors.email || ' '}
            />
          </Box>
        </Stack>

        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary' }}>
              PRC license no.
            </Typography>
            <Chip
              label="Optional"
              size="small"
              sx={{ height: 20, fontSize: '0.7rem', bgcolor: 'grey.100', color: 'text.secondary' }}
            />
          </Stack>
          <FormTextField
            name="prcLicense"
            placeholder="CE-0092451"
            value={form.prcLicense}
            onChange={handleChange}
          />
        </Box>

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
              error={Boolean(errors.password)}
              helperText={errors.password || ' '}
            />
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
              error={Boolean(errors.confirmPassword)}
              helperText={errors.confirmPassword || ' '}
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
                <Link href="#" underline="none" sx={{ color: 'primary.main', fontWeight: 600 }}>
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="#" underline="none" sx={{ color: 'primary.main', fontWeight: 600 }}>
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

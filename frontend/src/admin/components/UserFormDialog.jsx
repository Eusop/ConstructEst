import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import FormTextField from '../../components/FormTextField';
import PasswordField from '../../components/PasswordField';
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter';
import { isRequired, isValidEmail, isValidName, isStrongPassword, PASSWORD_RULE_MESSAGE } from '../../utils/validators';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useAdminToast } from '../context/AdminToastContext';
import { colors } from '../../theme/palette';

// userId is only shown (read-only). The server assigns it when the user is created.
const EMPTY_FORM = { firstName: '', lastName: '', userId: '', email: '', password: '', accessRole: 'user' };

function buildForm(user) {
  if (!user) return EMPTY_FORM;
  return { firstName: user.firstName, lastName: user.lastName, userId: user.userId, email: user.email, password: '', accessRole: user.accessRole };
}

function validate(form, isEdit) {
  const errors = {};
  if (!isRequired(form.firstName)) errors.firstName = 'First name is required';
  else if (!isValidName(form.firstName)) errors.firstName = 'Must start with a letter and be at least 2 characters';
  if (!isRequired(form.lastName)) errors.lastName = 'Last name is required';
  else if (!isValidName(form.lastName)) errors.lastName = 'Must start with a letter and be at least 2 characters';
  if (!isRequired(form.email)) errors.email = 'Email is required';
  else if (!isValidEmail(form.email)) errors.email = 'Enter a valid email address';
  if (!isEdit) {
    if (!isRequired(form.password)) errors.password = 'Password is required';
    else if (!isStrongPassword(form.password)) errors.password = PASSWORD_RULE_MESSAGE;
  }
  return errors;
}

/**
 * Add / Edit User dialog for AdminUsersPage. This is the Add User action the
 * User Management page keeps (the header's Add User button was removed).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {object|null} props.user Null for "add" mode, a user record for "edit" mode.
 * @param {boolean} [props.isSelf] Editing your own account: role and email are locked,
 *   the same as the backend rules (own email from Profile, no self-demotion).
 * @param {() => void} props.onClose
 * @param {(form: object) => Promise<void>} props.onSubmit
 */
function UserFormDialog({ open, user, isSelf = false, onClose, onSubmit }) {
  const isMobile = useIsMobile();
  const isEdit = Boolean(user);
  const [form, setForm] = useState(() => buildForm(user));
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useAdminToast();

  // Derived from `form` on every render (not in state), so an error updates
  // while typing (see SignUpForm.jsx).
  const errors = validate(form, isEdit);
  // Shown as soon as there is content, not only on blur, because browser
  // autofill never fires a blur (see SignUpForm.jsx).
  const showError = (field) => {
    const hasContent = form[field]?.trim().length > 0;
    // Returns the message (or '') so one value drives both the error state and the helper text.
    return errors[field] && (hasContent || touched[field] || submitAttempted) ? errors[field] : '';
  };

  useEffect(() => {
    if (open) {
      setForm(buildForm(user));
      setTouched({});
      setSubmitAttempted(false);
    }
  }, [open, user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (event) => {
    setTouched((prev) => ({ ...prev, [event.target.name]: true }));
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    if (Object.keys(errors).length > 0) {
      showToast('Please fix the highlighted fields.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(form);
    } catch (error) {
      showToast(error.message || 'Could not save this user. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} disableScrollLock maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ fontWeight: 700 }}>{isEdit ? 'Edit User' : 'Add User'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ pt: 0.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>First name</Typography>
              <FormTextField name="firstName" value={form.firstName} onChange={handleChange} onBlur={handleBlur} error={Boolean(showError('firstName'))} helperText={showError('firstName') || ' '} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Last name</Typography>
              <FormTextField name="lastName" value={form.lastName} onChange={handleChange} onBlur={handleBlur} error={Boolean(showError('lastName'))} helperText={showError('lastName') || ' '} />
            </Box>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>User ID</Typography>
              <FormTextField name="userId" value={form.userId} placeholder="Assigned automatically" disabled helperText={isEdit ? 'User ID cannot be changed' : 'Given when the user is saved'} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Email</Typography>
              <FormTextField
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSelf}
                error={Boolean(showError('email'))}
                helperText={isSelf ? 'Change your own email from Profile' : showError('email') || 'A new or changed email gets a verification code'}
              />
            </Box>
          </Stack>

          {!isEdit && (
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Password</Typography>
              <PasswordField name="password" value={form.password} onChange={handleChange} onBlur={handleBlur} error={Boolean(showError('password'))} helperText={showError('password') || ' '} />
              <PasswordStrengthMeter password={form.password} />
            </Box>
          )}

          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Role</Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              disabled={isSelf}
              value={form.accessRole}
              onChange={(event, value) => value && setForm((prev) => ({ ...prev, accessRole: value }))}
              sx={{
                bgcolor: 'grey.100',
                borderRadius: 2,
                p: 0.5,
                '& .MuiToggleButton-root': { border: 'none', borderRadius: 1.5, fontWeight: 600, textTransform: 'none' },
                '& .Mui-selected': { bgcolor: `${colors.accentBlue}!important`, color: '#fff!important' },
              }}
            >
              <ToggleButton value="user">User</ToggleButton>
              <ToggleButton value="admin">Admin</ToggleButton>
            </ToggleButtonGroup>
            {isSelf && (
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.75, ml: 1.75 }}>
                You can&apos;t change your own role.
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          sx={{ bgcolor: 'common.white', color: 'text.primary', border: '1px solid', borderColor: 'grey.300', '&:hover': { bgcolor: 'grey.50', borderColor: 'grey.300' } }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          variant="contained"
          disableElevation
          sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
        >
          {isEdit ? 'Save changes' : 'Add User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UserFormDialog;

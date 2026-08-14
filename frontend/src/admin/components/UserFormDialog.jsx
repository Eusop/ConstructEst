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
import { isRequired, isValidEmail, minLength } from '../../utils/validators';
import { colors } from '../../theme/palette';

const EMPTY_FORM = { firstName: '', lastName: '', userId: '', email: '', password: '', accessRole: 'user' };

function buildForm(user) {
  if (!user) return EMPTY_FORM;
  return { firstName: user.firstName, lastName: user.lastName, userId: user.userId, email: user.email, password: '', accessRole: user.accessRole };
}

function validate(form, isEdit) {
  const errors = {};
  if (!isRequired(form.firstName)) errors.firstName = 'First name is required';
  if (!isRequired(form.lastName)) errors.lastName = 'Last name is required';
  if (!isRequired(form.userId)) errors.userId = 'User ID is required';
  else if (!minLength(form.userId, 3)) errors.userId = 'User ID must be at least 3 characters';
  if (!isRequired(form.email)) errors.email = 'Email is required';
  else if (!isValidEmail(form.email)) errors.email = 'Enter a valid email address';
  if (!isEdit) {
    if (!isRequired(form.password)) errors.password = 'Password is required';
    else if (!minLength(form.password, 6)) errors.password = 'Password must be at least 6 characters';
  }
  return errors;
}

/**
 * Add / Edit User dialog for AdminUsersPage — this is the "appropriate Add
 * User action" the User Management page keeps (see requirement to remove
 * the header's Add User button but not the ability to create users).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {object|null} props.user Null for "add" mode, a user record for "edit" mode.
 * @param {() => void} props.onClose
 * @param {(form: object) => Promise<void>} props.onSubmit
 */
function UserFormDialog({ open, user, onClose, onSubmit }) {
  const isEdit = Boolean(user);
  const [form, setForm] = useState(() => buildForm(user));
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(buildForm(user));
      setErrors({});
    }
  }, [open, user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async () => {
    const validationErrors = validate(form, isEdit);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} disableScrollLock maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{isEdit ? 'Edit User' : 'Add User'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ pt: 0.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>First name</Typography>
              <FormTextField name="firstName" value={form.firstName} onChange={handleChange} error={Boolean(errors.firstName)} helperText={errors.firstName || ' '} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Last name</Typography>
              <FormTextField name="lastName" value={form.lastName} onChange={handleChange} error={Boolean(errors.lastName)} helperText={errors.lastName || ' '} />
            </Box>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>User ID</Typography>
              <FormTextField name="userId" value={form.userId} onChange={handleChange} disabled={isEdit} error={Boolean(errors.userId)} helperText={errors.userId || (isEdit ? 'User ID cannot be changed' : ' ')} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Email</Typography>
              <FormTextField name="email" type="email" value={form.email} onChange={handleChange} error={Boolean(errors.email)} helperText={errors.email || ' '} />
            </Box>
          </Stack>

          {!isEdit && (
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Password</Typography>
              <PasswordField name="password" value={form.password} onChange={handleChange} error={Boolean(errors.password)} helperText={errors.password || ' '} />
            </Box>
          )}

          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Role</Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
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

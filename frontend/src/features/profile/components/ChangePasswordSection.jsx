import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PasswordField from '../../../components/PasswordField';
import PasswordStrengthMeter from '../../../components/PasswordStrengthMeter';

const FIELD_LABEL_SX = { fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 };
const LOCK_ICON = <LockRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />;

/**
 * "Change Password" section body: current/new/confirm password fields
 * (each with a show/hide toggle) plus a helper caption. Changing the
 * password is optional — leaving all three fields blank just means the
 * password isn't being changed (see the validation in ProfilePage).
 *
 * @param {object} props
 * @param {{currentPassword: string, newPassword: string, confirmPassword: string}} props.form
 * @param {object} props.errors
 * @param {object} props.touched
 * @param {(field: string, value: string) => void} props.onFieldChange
 * @param {(field: string) => void} props.onFieldBlur
 */
function ChangePasswordSection({ form, errors, touched, onFieldChange, onFieldBlur }) {
  // Shows the instant there's content, not gated on blur alone — a browser
  // autofilling saved credentials never fires a real blur event (see
  // SignUpForm.jsx for the same fix and fuller explanation).
  const showError = (field) => {
    const hasContent = form[field]?.trim().length > 0;
    return Boolean(errors[field]) && (hasContent || touched[field]);
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography sx={FIELD_LABEL_SX}>Current Password</Typography>
        <PasswordField
          name="currentPassword"
          autoComplete="current-password"
          showToggle
          icon={LOCK_ICON}
          value={form.currentPassword}
          onChange={(event) => onFieldChange('currentPassword', event.target.value)}
          onBlur={() => onFieldBlur('currentPassword')}
          error={Boolean(showError('currentPassword'))}
          helperText={showError('currentPassword') || ' '}
        />
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={FIELD_LABEL_SX}>New Password</Typography>
          <PasswordField
            name="newPassword"
            autoComplete="new-password"
            showToggle
            icon={LOCK_ICON}
            value={form.newPassword}
            onChange={(event) => onFieldChange('newPassword', event.target.value)}
            onBlur={() => onFieldBlur('newPassword')}
            error={Boolean(showError('newPassword'))}
            helperText={showError('newPassword') || ' '}
          />
          <PasswordStrengthMeter password={form.newPassword} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={FIELD_LABEL_SX}>Confirm New Password</Typography>
          <PasswordField
            name="confirmPassword"
            autoComplete="new-password"
            showToggle
            icon={LOCK_ICON}
            value={form.confirmPassword}
            onChange={(event) => onFieldChange('confirmPassword', event.target.value)}
            onBlur={() => onFieldBlur('confirmPassword')}
            error={Boolean(showError('confirmPassword'))}
            helperText={showError('confirmPassword') || ' '}
          />
        </Box>
      </Stack>

      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: -1.5 }}>
        8–16 characters with uppercase, lowercase, a number, and a special character.
      </Typography>
    </Stack>
  );
}

export default ChangePasswordSection;

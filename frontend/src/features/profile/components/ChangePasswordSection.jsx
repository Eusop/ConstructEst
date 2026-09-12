import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PasswordField from '../../../components/PasswordField';
import PasswordStrengthMeter from '../../../components/PasswordStrengthMeter';
import { colors } from '../../../theme/palette';

const FIELD_LABEL_SX = { fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 };
const LOCK_ICON = <LockRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />;

/**
 * "Change Password" section body: current/new/confirm password fields
 * (each with a show/hide toggle) plus a helper caption. Changing the
 * password is independent of the rest of the page: this section has its own
 * submit button and its own validation, so saving a name or email never
 * involves these fields at all.
 *
 * @param {object} props
 * @param {{currentPassword: string, newPassword: string, confirmPassword: string}} props.form
 * @param {object} props.errors
 * @param {object} props.touched
 * @param {(field: string, value: string) => void} props.onFieldChange
 * @param {(field: string) => void} props.onFieldBlur
 * @param {() => void} props.onSubmit
 * @param {boolean} [props.isSaving]
 * @param {boolean} [props.isActive] Whether any of the three fields has
 *   content yet — the submit button only appears once true, so it isn't
 *   sitting there implying a save is needed when nothing has been typed.
 */
function ChangePasswordSection({ form, errors, touched, onFieldChange, onFieldBlur, onSubmit, isSaving = false, isActive = false }) {
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

      {/* Was "8-16 characters with uppercase, lowercase, a number, and a
          special character", which no longer matched anything: the rule is
          just a 6-character minimum, enforced by isStrongPassword here and by
          changePassword on the server. */}
      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: -1.5 }}>
        At least 6 characters. We will email you whenever your password changes.
      </Typography>

      {/* This section saves on its own, separate from the page's "Save
          changes" — that button used to submit the password too, so editing
          a name meant re-typing the current password for no reason. Only
          shown once something has actually been typed here, so it doesn't
          sit next to "Save changes" looking like a second way to do the
          same thing when the section is untouched. */}
      {isActive && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            onClick={onSubmit}
            variant="contained"
            disableElevation
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
          >
            {isSaving ? 'Changing…' : 'Change password'}
          </Button>
        </Box>
      )}
    </Stack>
  );
}

export default ChangePasswordSection;

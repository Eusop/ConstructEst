import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import ProfileAvatarSection from '../features/profile/components/ProfileAvatarSection';
import ProfileSectionHeader from '../features/profile/components/ProfileSectionHeader';
import PersonalInformationSection from '../features/profile/components/PersonalInformationSection';
import ChangePasswordSection from '../features/profile/components/ChangePasswordSection';
import { useUser } from '../context/UserContext';
import { useNotifications } from '../context/NotificationsContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { isRequired, isValidEmail, passwordsMatch, isStrongPassword } from '../utils/validators';
import { colors } from '../theme/palette';

const EMPTY_PASSWORD_FIELDS = { currentPassword: '', newPassword: '', confirmPassword: '' };

function buildForm(profile) {
  return {
    fullName: profile.userName ?? '',
    username: profile.username ?? '',
    email: profile.email ?? '',
    avatarUrl: profile.avatarUrl ?? null,
    ...EMPTY_PASSWORD_FIELDS,
  };
}

function validate(form) {
  const errors = {};

  if (!isRequired(form.fullName)) errors.fullName = 'Full name is required';
  if (!isRequired(form.username)) errors.username = 'Username is required';

  if (!isRequired(form.email)) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Enter a valid email address';
  }

  // Changing the password is optional — only validate the password fields
  // at all once the user has actually started filling one of them in.
  const isChangingPassword = isRequired(form.currentPassword) || isRequired(form.newPassword) || isRequired(form.confirmPassword);
  if (isChangingPassword) {
    if (!isRequired(form.currentPassword)) errors.currentPassword = 'Current password is required';

    if (!isRequired(form.newPassword)) {
      errors.newPassword = 'New password is required';
    } else if (!isStrongPassword(form.newPassword)) {
      errors.newPassword = 'Use at least 8 characters with a mix of letters, numbers, and symbols';
    }

    if (!isRequired(form.confirmPassword)) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (!passwordsMatch(form.newPassword, form.confirmPassword)) {
      errors.confirmPassword = 'Passwords do not match';
    }
  }

  return errors;
}

/**
 * Profile: the signed-in user's editable identity (name, username, email,
 * avatar) plus a password-change form. Frontend-only — "Save changes"
 * commits into UserContext (so e.g. the Dashboard greeting picks up a new
 * name immediately), "Cancel" discards the draft back to whatever's
 * currently saved there. Follows the same draft/saved `useState` pair and
 * Save/Cancel button styling as the Settings (Calibration) page.
 *
 * The avatar is the one exception to the draft/Save flow — selecting or
 * removing a photo commits to UserContext immediately (see
 * `handleAvatarChange`), since it needs to show up in the header avatar
 * right away rather than waiting for Save.
 */
function ProfilePage() {
  const profile = useUser();
  const { updateProfile } = profile;
  const { addNotification } = useNotifications();
  const isMobile = useIsMobile();

  const [savedForm, setSavedForm] = useState(() => buildForm(profile));
  const [form, setForm] = useState(() => buildForm(profile));
  const [touched, setTouched] = useState({});

  // Derived fresh from `form` on every render (not stored in its own
  // state) — this is what makes blur-triggered validation actually work:
  // `touched` just decides which of these already-current errors to show.
  const errors = validate(form);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFieldBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleAvatarChange = (url) => {
    updateProfile({ avatarUrl: url });
    setForm((prev) => ({ ...prev, avatarUrl: url }));
    setSavedForm((prev) => ({ ...prev, avatarUrl: url }));
  };

  const handleCancel = () => {
    setForm(savedForm);
    setTouched({});
  };

  const handleSave = () => {
    setTouched({
      fullName: true,
      username: true,
      email: true,
      currentPassword: true,
      newPassword: true,
      confirmPassword: true,
    });
    if (Object.keys(errors).length > 0) return;

    updateProfile({ userName: form.fullName, username: form.username, email: form.email });
    addNotification({
      type: 'profile_updated',
      title: 'Profile updated',
      description: 'Your profile details were updated.',
    });

    const committed = { ...form, ...EMPTY_PASSWORD_FIELDS };
    setSavedForm(committed);
    setForm(committed);
    setTouched({});
  };

  return (
    // Mobile: no longer forced to stretch and fill the viewport (`flex:1`)
    // — with both accordions now closed by default, that forced stretch
    // left a large empty gap below the collapsed sections instead of the
    // card simply ending at its natural (shorter) height. sm+ keeps the
    // original flex:1 behavior unchanged.
    <Stack spacing={2.5} sx={{ width: '100%', flex: { xs: 'unset', sm: 1 }, minHeight: { xs: 'auto', sm: 0 } }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: 'common.white',
          boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
          overflow: 'hidden',
          flex: { xs: 'unset', sm: 1 },
          minHeight: { xs: 'auto', sm: 0 },
        }}
      >
        <Stack divider={<Divider />}>
          <ProfileAvatarSection
            fullName={form.fullName}
            username={form.username}
            avatarUrl={form.avatarUrl}
            onAvatarChange={handleAvatarChange}
          />

          {isMobile ? (
            <Box sx={{ p: 1.5 }}>
              <Accordion
                disableGutters
                elevation={0}
                sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: '12px !important', mb: 1.25, '&:before': { display: 'none' }, overflow: 'hidden' }}
              >
                <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                  <ProfileSectionHeader
                    icon={PersonRoundedIcon}
                    iconBg={colors.iconBlueBg}
                    iconFg={colors.iconBlueFg}
                    title="Personal Information"
                    subtitle="Your basic account details"
                  />
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <PersonalInformationSection
                    form={form}
                    errors={errors}
                    touched={touched}
                    onFieldChange={updateField}
                    onFieldBlur={handleFieldBlur}
                  />
                </AccordionDetails>
              </Accordion>

              <Accordion
                disableGutters
                elevation={0}
                sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: '12px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}
              >
                <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                  <ProfileSectionHeader
                    icon={LockRoundedIcon}
                    iconBg={colors.iconOrangeBg}
                    iconFg={colors.iconOrangeFg}
                    title="Change Password"
                    subtitle="Keep your account secure"
                  />
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <ChangePasswordSection
                    form={form}
                    errors={errors}
                    touched={touched}
                    onFieldChange={updateField}
                    onFieldBlur={handleFieldBlur}
                  />
                </AccordionDetails>
              </Accordion>
            </Box>
          ) : (
            <>
              <Box sx={{ p: 4 }}>
                <ProfileSectionHeader
                  icon={PersonRoundedIcon}
                  iconBg={colors.iconBlueBg}
                  iconFg={colors.iconBlueFg}
                  title="Personal Information"
                  subtitle="Your basic account details"
                />
                <PersonalInformationSection
                  form={form}
                  errors={errors}
                  touched={touched}
                  onFieldChange={updateField}
                  onFieldBlur={handleFieldBlur}
                />
              </Box>

              <Divider />

              <Box sx={{ p: 4 }}>
                <ProfileSectionHeader
                  icon={LockRoundedIcon}
                  iconBg={colors.iconOrangeBg}
                  iconFg={colors.iconOrangeFg}
                  title="Change Password"
                  subtitle="Keep your account secure"
                />
                <ChangePasswordSection
                  form={form}
                  errors={errors}
                  touched={touched}
                  onFieldChange={updateField}
                  onFieldBlur={handleFieldBlur}
                />
              </Box>
            </>
          )}

          <Box sx={{ p: { xs: 2, md: 4 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
              <Button
                onClick={handleCancel}
                sx={{
                  bgcolor: 'common.white',
                  color: 'text.primary',
                  border: '1px solid',
                  borderColor: 'grey.300',
                  '&:hover': { bgcolor: 'grey.50', borderColor: 'grey.300' },
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                variant="contained"
                disableElevation
                sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
              >
                Save changes
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}

export default ProfilePage;

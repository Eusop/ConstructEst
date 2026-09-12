import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
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
import { useToast } from '../context/ToastContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { isRequired, isValidEmail, passwordsMatch, isStrongPassword } from '../utils/validators';
import { updateProfileRequest, changePasswordRequest, uploadAvatarRequest, removeAvatarRequest } from '../services/usersService';
import { resolveAssetUrl } from '../services/apiClient';
import { colors } from '../theme/palette';

const EMPTY_PASSWORD_FIELDS = { currentPassword: '', newPassword: '', confirmPassword: '' };

function buildForm(profile) {
  return {
    fullName: profile.userName ?? '',
    employeeId: profile.employeeId ?? '',
    email: profile.email ?? '',
    avatarUrl: profile.avatarUrl ?? null,
    ...EMPTY_PASSWORD_FIELDS,
  };
}

// DB stores first/last name separately but the form only has one Full
// Name field, so split it here. Falls back to reusing the first word if
// only one was typed, since last_name can't be empty.
function splitFullName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') || parts[0] };
}

// Split from the password rules below because the two now save separately —
// "Save changes" must not care whether a password field happens to be filled.
function validateDetails(form) {
  const errors = {};

  if (!isRequired(form.fullName)) errors.fullName = 'Full name is required';

  if (!isRequired(form.email)) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Enter a valid email address';
  }

  return errors;
}

function validatePassword(form) {
  const errors = {};

  if (!isRequired(form.currentPassword)) errors.currentPassword = 'Current password is required';

  if (!isRequired(form.newPassword)) {
    errors.newPassword = 'New password is required';
  } else if (!isStrongPassword(form.newPassword)) {
    errors.newPassword = 'Must be at least 6 characters';
  }

  if (!isRequired(form.confirmPassword)) {
    errors.confirmPassword = 'Please confirm your new password';
  } else if (!passwordsMatch(form.newPassword, form.confirmPassword)) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
}

/**
 * Profile page: name, email, avatar, and password change. Employee ID is
 * shown but read-only.
 *
 * Three independent saves rather than one, which is the fix for having to
 * re-enter the current password just to edit a name: "Save changes" only
 * ever sends name/email (PUT /users/me), the Change Password section has its
 * own button (PUT /users/me/password), and the photo uploads on its own
 * (POST /users/me/avatar) the moment it is confirmed. Nothing about a
 * password is read unless the user is deliberately changing one.
 */
function ProfilePage() {
  const profile = useUser();
  const { updateProfile } = profile;
  const { addNotification } = useNotifications();
  const { showToast } = useToast();
  const isMobile = useIsMobile();

  const [savedForm, setSavedForm] = useState(() => buildForm(profile));
  const [form, setForm] = useState(() => buildForm(profile));
  const [touched, setTouched] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);

  // Recomputed from `form` every render, `touched` just decides which of
  // these to actually show. The password errors are only surfaced once the
  // user has started filling that section in, so an untouched Change Password
  // block never reports "required" at someone editing their email.
  const isChangingPassword = isRequired(form.currentPassword) || isRequired(form.newPassword) || isRequired(form.confirmPassword);
  const errors = { ...validateDetails(form), ...(isChangingPassword ? validatePassword(form) : {}) };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFieldBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // The photo is its own save, separate from the page's "Save changes":
  // picking a file only previews it, and this runs when the user confirms.
  // `file` null means "remove my photo".
  const handleAvatarSave = async (file) => {
    setIsSavingPhoto(true);
    try {
      const user = file
        ? await uploadAvatarRequest(file)
        : await removeAvatarRequest();
      // Server-generated URL, not the local blob preview — that is what makes
      // the photo survive a logout instead of dying with the browser document.
      updateProfile({ avatarUrl: user.avatarUrl });
      setForm((prev) => ({ ...prev, avatarUrl: resolveAssetUrl(user.avatarUrl) }));
      setSavedForm((prev) => ({ ...prev, avatarUrl: resolveAssetUrl(user.avatarUrl) }));
      showToast(file ? 'Profile photo updated' : 'Profile photo removed', 'success');
    } catch (error) {
      showToast(error.message || 'Could not update your photo. Please try again.');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleCancel = () => {
    setForm(savedForm);
    setTouched({});
  };

  const handleChangePassword = async () => {
    setTouched((prev) => ({ ...prev, currentPassword: true, newPassword: true, confirmPassword: true }));
    const passwordErrors = validatePassword(form);
    if (Object.keys(passwordErrors).length > 0) {
      showToast('Please fix the highlighted fields before saving.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await changePasswordRequest({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      addNotification({
        type: 'profile_updated',
        title: 'Password changed',
        description: 'Your password was updated. Check your email for a confirmation.',
      });
      showToast('Password changed', 'success');
      // Clearing these is deliberate, not a glitch: the app never holds a
      // password, so there is nothing to leave in the boxes afterwards.
      setForm((prev) => ({ ...prev, ...EMPTY_PASSWORD_FIELDS }));
      setTouched((prev) => ({ ...prev, currentPassword: false, newPassword: false, confirmPassword: false }));
    } catch (error) {
      showToast(error.message || 'Could not change your password. Please try again.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Name and email only. Passwords are handled by handleChangePassword and
  // the photo by handleAvatarSave, so this never reads a password field.
  const handleSave = async () => {
    setTouched((prev) => ({ ...prev, fullName: true, email: true }));
    const detailErrors = validateDetails(form);
    if (Object.keys(detailErrors).length > 0) {
      showToast('Please fix the highlighted fields before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const { firstName, lastName } = splitFullName(form.fullName);
      const user = await updateProfileRequest({ firstName, lastName, email: form.email });
      // Reflects the server response into UserContext right away, so the
      // header picks up the new name without a refetch.
      updateProfile({ userName: user.userName, email: user.email });

      addNotification({
        type: 'profile_updated',
        title: 'Profile updated',
        description: 'Your profile details were updated.',
      });
      showToast('Profile updated', 'success');

      setSavedForm((prev) => ({ ...prev, fullName: form.fullName, email: form.email }));
      setTouched((prev) => ({ ...prev, fullName: false, email: false }));
    } catch (error) {
      showToast(error.message || 'Could not save your changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    // Mobile doesn't stretch to fill the viewport, both accordions are
    // closed by default so that just left an empty gap. sm+ unchanged.
    <Stack spacing={2.5} sx={{ width: '100%', flex: { xs: 'unset', sm: 1 }, minHeight: { xs: 'auto', sm: 0 } }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: 'common.white',
          boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
          // 'auto' not 'hidden', this card can be shorter than its content
          // and was silently clipping the bottom of the page.
          overflow: 'auto',
          flex: { xs: 'unset', sm: 1 },
          minHeight: { xs: 'auto', sm: 0 },
        }}
      >
        <Stack divider={<Divider />}>
          <ProfileAvatarSection
            fullName={form.fullName}
            employeeId={form.employeeId}
            avatarUrl={form.avatarUrl}
            onAvatarSave={handleAvatarSave}
            isSaving={isSavingPhoto}
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
                    onSubmit={handleChangePassword}
                    isSaving={isSavingPassword}
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
                  onSubmit={handleChangePassword}
                  isSaving={isSavingPassword}
                />
              </Box>
            </>
          )}

          <Box sx={{ p: { xs: 2, md: 4 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
              <Button
                onClick={handleCancel}
                disabled={isSaving}
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
                disabled={isSaving}
                startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
              >
                {isSaving ? 'Saving…' : 'Save changes'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}

export default ProfilePage;

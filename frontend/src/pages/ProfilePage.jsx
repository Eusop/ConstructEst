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
import { useToast } from '../context/ToastContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { isRequired, isValidEmail, passwordsMatch, isStrongPassword, PASSWORD_RULE_MESSAGE } from '../utils/validators';
import { updateProfileRequest, changePasswordRequest, uploadAvatarRequest, removeAvatarRequest } from '../services/usersService';
import { resolveAssetUrl } from '../services/apiClient';
import { colors } from '../theme/palette';

const EMPTY_PASSWORD_FIELDS = { currentPassword: '', newPassword: '', confirmPassword: '' };

function buildForm(profile) {
  return {
    fullName: profile.userName ?? '',
    userId: profile.userId ?? '',
    email: profile.email ?? '',
    avatarUrl: profile.avatarUrl ?? null,
    ...EMPTY_PASSWORD_FIELDS,
  };
}

// The DB stores first and last name separately but the form has one Full Name
// field, so split it. Reuses the first word if only one was typed (last_name
// can't be empty).
function splitFullName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') || parts[0] };
}

// Separate from the password rules because they save separately: "Save
// changes" must not care whether a password field is filled.
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
    errors.newPassword = PASSWORD_RULE_MESSAGE;
  }

  if (!isRequired(form.confirmPassword)) {
    errors.confirmPassword = 'Please confirm your new password';
  } else if (!passwordsMatch(form.newPassword, form.confirmPassword)) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
}

/**
 * Profile page: name, email, avatar and password change. User ID is
 * read-only. There are three separate saves: "Save changes" sends only
 * name/email (PUT /users/me), Change Password has its own button (PUT
 * /users/me/password), and the photo uploads when confirmed (POST
 * /users/me/avatar). A password is only read when the user is changing one.
 */
function ProfilePage() {
  const profile = useUser();
  const { updateProfile } = profile;
  const { showToast } = useToast();
  const isMobile = useIsMobile();

  const [savedForm, setSavedForm] = useState(() => buildForm(profile));
  const [form, setForm] = useState(() => buildForm(profile));
  const [touched, setTouched] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);

  // Recomputed from `form` every render; `touched` decides which errors show.
  // Password errors only show once the user starts filling that section, so an
  // untouched Change Password block never says "required" while editing email.
  // currentPassword is excluded on purpose: browsers autofill it on page load,
  // which used to reveal the Change Password button by itself. newPassword and
  // confirmPassword are the real signal of a password change.
  const isChangingPassword = isRequired(form.newPassword) || isRequired(form.confirmPassword);
  const errors = { ...validateDetails(form), ...(isChangingPassword ? validatePassword(form) : {}) };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFieldBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // The photo saves on its own, apart from "Save changes": picking a file only
  // previews it, and this runs on confirm. `file` null means remove the photo.
  const handleAvatarSave = async (file) => {
    setIsSavingPhoto(true);
    try {
      const user = file
        ? await uploadAvatarRequest(file)
        : await removeAvatarRequest();
      // Use the server URL, not the local blob preview, so the photo survives a logout.
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
      showToast('Password changed', 'success');
      // Cleared on purpose: the app never holds a password, so nothing should stay in the boxes.
      setForm((prev) => ({ ...prev, ...EMPTY_PASSWORD_FIELDS }));
      setTouched((prev) => ({ ...prev, currentPassword: false, newPassword: false, confirmPassword: false }));
    } catch (error) {
      showToast(error.message || 'Could not change your password. Please try again.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Name and email only. Passwords go through handleChangePassword and the
  // photo through handleAvatarSave.
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
      // Put the server response into UserContext so the header shows the new name.
      updateProfile({ userName: user.userName, email: user.email });

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
    // Mobile doesn't stretch to fill the viewport (both accordions start closed,
    // which left an empty gap). sm+ unchanged.
    <Stack spacing={2.5} sx={{ width: '100%', flex: { xs: 'unset', sm: 1 }, minHeight: { xs: 'auto', sm: 0 } }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: 'common.white',
          boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
          // 'auto' not 'hidden': the card can be shorter than its content and
          // hidden clipped the bottom of the page.
          overflow: 'auto',
          flex: { xs: 'unset', sm: 1 },
          minHeight: { xs: 'auto', sm: 0 },
        }}
      >
        <Stack divider={<Divider />}>
          <ProfileAvatarSection
            fullName={form.fullName}
            userId={form.userId}
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
                    isActive={isChangingPassword}
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
                  isActive={isChangingPassword}
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

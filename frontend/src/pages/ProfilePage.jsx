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
import { updateProfileRequest, changePasswordRequest } from '../services/usersService';
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

// The backend/DB store first/last name separately; Profile's own form only
// ever shows one combined field, so this splits at save time — first word
// is the first name, everything else the last name, falling back to
// reusing the first word if only one was typed (last_name is NOT NULL, so
// this never sends an empty string for it).
function splitFullName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') || parts[0] };
}

function validate(form) {
  const errors = {};

  if (!isRequired(form.fullName)) errors.fullName = 'Full name is required';

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
      errors.newPassword = 'Must be at least 6 characters';
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
 * Profile: the signed-in user's editable identity (name, email, avatar —
 * Employee ID is shown but read-only, matching Admin's own Edit User dialog)
 * plus a password-change form. Backed by the real backend
 * (services/usersService.js): "Save changes" calls `PUT /users/me` and,
 * only if any password field was touched, `PUT /users/me/password`
 * (independent calls — a failed password change doesn't undo an already-
 * saved name/email change), then reflects the result into UserContext (so
 * e.g. the Dashboard greeting picks up a new name immediately) — the server
 * response is the source of truth, this just avoids a refetch. "Cancel"
 * discards the draft back to whatever's currently saved there. Follows the
 * same draft/saved `useState` pair and Save/Cancel button styling as the
 * Settings (Calibration) page.
 *
 * The avatar is the one exception to the draft/Save flow — selecting or
 * removing a photo commits to UserContext immediately (see
 * `handleAvatarChange`), since it needs to show up in the header avatar
 * right away rather than waiting for Save. (Note: avatar upload isn't
 * itself persisted to the backend yet — a pre-existing gap, out of scope
 * here.)
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

  const handleSave = async () => {
    setTouched({
      fullName: true,
      email: true,
      currentPassword: true,
      newPassword: true,
      confirmPassword: true,
    });
    if (Object.keys(errors).length > 0) {
      showToast('Please fix the highlighted fields before saving.');
      return;
    }

    const isChangingPassword = isRequired(form.currentPassword) || isRequired(form.newPassword) || isRequired(form.confirmPassword);

    setIsSaving(true);
    try {
      const { firstName, lastName } = splitFullName(form.fullName);
      const user = await updateProfileRequest({ firstName, lastName, email: form.email });
      // Server is still the source of truth (`user` is its response) — this
      // just reflects it into UserContext immediately so e.g. the header
      // avatar/greeting picks it up without a refetch.
      updateProfile({ userName: user.userName, email: user.email });

      // A separate, independent backend call — if this fails (e.g. wrong
      // current password), the name/email change above already genuinely
      // succeeded and stays committed; only the password portion reports
      // its own error below, rather than pretending this was one atomic
      // save.
      if (isChangingPassword) {
        await changePasswordRequest({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      }

      addNotification({
        type: 'profile_updated',
        title: 'Profile updated',
        description: 'Your profile details were updated.',
      });
      showToast('Profile updated', 'success');

      const committed = { ...form, ...EMPTY_PASSWORD_FIELDS };
      setSavedForm(committed);
      setForm(committed);
      setTouched({});
    } catch (error) {
      showToast(error.message || 'Could not save your changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
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
          // 'auto' rather than 'hidden' — this card's flex-computed height
          // can end up shorter than its actual content (Personal
          // Information + Change Password, both open), which was silently
          // clipping the bottom of the page with no way to scroll to it.
          // Same fix as QuantityTakeoffTable.jsx/ManualBrandTable.jsx/
          // BillOfMaterialsPage.jsx's identical Paper shape.
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

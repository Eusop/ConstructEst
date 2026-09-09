import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import { getInitials } from '../../../utils/getInitials';
import { colors } from '../../../theme/palette';

const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const INVALID_FILE_MESSAGE = 'Only JPG, JPEG, PNG, and WebP image files are allowed.';
// Matches MAX_AVATAR_BYTES in backend/src/middleware/upload.js. Checked here
// too so an oversized file is refused instantly instead of after the upload.
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Profile page header: a big circular avatar (the uploaded photo, or initials
 * once a name is set — never a hardcoded placeholder identity), the display
 * name + "@employeeId", and the photo actions.
 *
 * Picking a file only *previews* it; nothing is sent until "Save photo" is
 * pressed, which is what the separate `onAvatarSave` is for. It used to
 * commit on selection, but only into React state — the preview was a `blob:`
 * URL that was never uploaded, so the photo silently disappeared at the next
 * login. The preview URL is owned here now (revoked when replaced or on
 * unmount) rather than being handed to UserContext, since it never leaves
 * this component.
 *
 * @param {object} props
 * @param {string} props.fullName
 * @param {string} props.employeeId
 * @param {string|null} props.avatarUrl The saved photo, as a server path.
 * @param {(file: File|null) => Promise<void>} props.onAvatarSave `null` removes.
 * @param {boolean} [props.isSaving]
 */
function ProfileAvatarSection({ fullName, employeeId, avatarUrl, onAvatarSave, isSaving = false }) {
  const inputRef = useRef(null);
  const [fileError, setFileError] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Object URLs hold the file in memory until revoked, so each one is released
  // as soon as it is replaced, and the last one on unmount.
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const clearPending = () => {
    setPendingFile(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFileSelect = (fileList) => {
    const file = fileList?.[0];
    if (!file) return;

    if (!ALLOWED_EXTENSIONS.test(file.name)) {
      setFileError(INVALID_FILE_MESSAGE);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError('That image is larger than 2MB. Please choose a smaller one.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setFileError('');
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!pendingFile) return;
    await onAvatarSave(pendingFile);
    clearPending();
  };

  const handleRemove = async () => {
    setFileError('');
    clearPending();
    await onAvatarSave(null);
  };

  const shownUrl = previewUrl ?? avatarUrl ?? undefined;

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, textAlign: 'center' }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <Avatar
          src={shownUrl}
          sx={{ width: { xs: 76, sm: 96 }, height: { xs: 76, sm: 96 }, bgcolor: colors.accentBlue, fontSize: { xs: '1.6rem', sm: '2rem' }, fontWeight: 700 }}
        >
          {getInitials(fullName)}
        </Avatar>

        <Box
          role="button"
          tabIndex={0}
          aria-label="Change photo"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
          }}
          sx={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: 'common.white',
            border: '1px solid',
            borderColor: 'grey.200',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(20, 30, 60, 0.15)',
          }}
        >
          <PhotoCameraRoundedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
        </Box>

        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          hidden
          onChange={(event) => handleFileSelect(event.target.files)}
        />
      </Box>

      {fullName && (
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.2rem' }, color: 'text.primary', mt: 2 }}>{fullName}</Typography>
      )}
      {employeeId && <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.82rem', sm: '0.9rem' } }}>@{employeeId}</Typography>}
      <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mt: 0.5 }}>
        Manage your account information
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'center', alignItems: 'center', mt: 2.5 }}>
        {pendingFile ? (
          // Only shown once something is actually staged, so this section has
          // no save button competing for attention the rest of the time.
          <>
            <Button
              onClick={handleSave}
              variant="contained"
              disableElevation
              disabled={isSaving}
              startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
            >
              {isSaving ? 'Saving…' : 'Save photo'}
            </Button>
            <Button onClick={clearPending} disabled={isSaving} sx={{ color: 'text.secondary' }}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => inputRef.current?.click()}
              variant="contained"
              disableElevation
              disabled={isSaving}
              sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
            >
              Change Photo
            </Button>
            <Button
              onClick={handleRemove}
              disabled={!avatarUrl || isSaving}
              sx={{ color: colors.iconRedFg, '&:hover': { bgcolor: colors.iconRedBg } }}
            >
              Remove Photo
            </Button>
          </>
        )}
      </Stack>

      {pendingFile && !fileError && (
        <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem', mt: 1.5 }}>
          Preview only — press Save photo to upload it.
        </Typography>
      )}
      {fileError && (
        <Typography sx={{ color: 'error.main', fontSize: '0.78rem', mt: 1.5 }}>{fileError}</Typography>
      )}
    </Box>
  );
}

export default ProfileAvatarSection;

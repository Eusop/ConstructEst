import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import { getInitials } from '../../../utils/getInitials';
import { colors } from '../../../theme/palette';

const ALLOWED_EXTENSIONS = /\.(jpe?g|png)$/i;
const INVALID_FILE_MESSAGE = 'Only JPG, JPEG, and PNG image files are allowed.';

/**
 * Profile page header: a big circular avatar (the uploaded photo, or
 * initials once a name is set — never a hardcoded placeholder identity),
 * the display name + "@username", and the Change/Remove Photo actions.
 *
 * Unlike the rest of the Profile page's fields, avatar changes commit
 * immediately (via `onAvatarChange`, see ProfilePage) instead of waiting
 * for Save — so the header avatar picks up a new photo right away. Because
 * the resulting object URL is then shared (stored in UserContext and read
 * by both this page and the header avatar) rather than owned locally, its
 * lifecycle — revoking the previous URL once it's replaced — is handled in
 * UserContext, not here; this component only ever creates a new one and
 * hands it off.
 *
 * @param {object} props
 * @param {string} props.fullName
 * @param {string} props.username
 * @param {string|null} props.avatarUrl
 * @param {(url: string|null) => void} props.onAvatarChange
 */
function ProfileAvatarSection({ fullName, username, avatarUrl, onAvatarChange }) {
  const inputRef = useRef(null);
  const [fileError, setFileError] = useState('');

  const handleFileSelect = (fileList) => {
    const file = fileList?.[0];
    if (!file) return;

    if (!ALLOWED_EXTENSIONS.test(file.name)) {
      setFileError(INVALID_FILE_MESSAGE);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setFileError('');
    onAvatarChange(URL.createObjectURL(file));
  };

  const handleRemove = () => {
    setFileError('');
    onAvatarChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Box sx={{ p: { xs: 3, md: 4 }, textAlign: 'center' }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <Avatar
          src={avatarUrl ?? undefined}
          sx={{ width: 96, height: 96, bgcolor: colors.accentBlue, fontSize: '2rem', fontWeight: 700 }}
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
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          hidden
          onChange={(event) => handleFileSelect(event.target.files)}
        />
      </Box>

      {fullName && (
        <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: 'text.primary', mt: 2 }}>{fullName}</Typography>
      )}
      {username && <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>@{username}</Typography>}
      <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mt: 0.5 }}>
        Manage your account information
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'center', alignItems: 'center', mt: 2.5 }}>
        <Button
          onClick={() => inputRef.current?.click()}
          variant="contained"
          disableElevation
          sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
        >
          Change Photo
        </Button>
        <Button
          onClick={handleRemove}
          disabled={!avatarUrl}
          sx={{ color: colors.iconRedFg, '&:hover': { bgcolor: colors.iconRedBg } }}
        >
          Remove Photo
        </Button>
      </Stack>

      {fileError && (
        <Typography sx={{ color: 'error.main', fontSize: '0.78rem', mt: 1.5 }}>{fileError}</Typography>
      )}
    </Box>
  );
}

export default ProfileAvatarSection;

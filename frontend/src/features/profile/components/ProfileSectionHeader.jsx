import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/**
 * Small icon-tile + title + subtitle header, used to introduce each section
 * of the Profile card (Personal Information, Change Password) — matches the
 * icon-tile convention already used elsewhere (e.g. Dashboard's StatCard).
 *
 * @param {object} props
 * @param {React.ElementType} props.icon
 * @param {string} props.iconBg
 * @param {string} props.iconFg
 * @param {string} props.title
 * @param {string} props.subtitle
 */
function ProfileSectionHeader({ icon: Icon, iconBg, iconFg, title, subtitle }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 3 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: 2,
          bgcolor: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon sx={{ color: iconFg, fontSize: 20 }} />
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.05rem' }, color: 'text.primary' }}>{title}</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>{subtitle}</Typography>
      </Box>
    </Stack>
  );
}

export default ProfileSectionHeader;

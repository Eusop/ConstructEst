import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/**
 * Generic "nothing here yet" state shared by the Admin Module's Dashboard,
 * User Management, Hardware Stores, and Materials & Brands pages — mirrors
 * the User Module's EmptyProjectsState/NoStoreSelectedState visual pattern
 * (icon tile, title, description, optional action) instead of introducing a
 * different look for admin-only screens.
 *
 * @param {object} props
 * @param {React.ElementType} props.icon
 * @param {string} props.iconBg
 * @param {string} props.iconFg
 * @param {string} props.title
 * @param {string} props.description
 * @param {React.ReactNode} [props.action]
 * @param {number} [props.minHeight=360]
 */
function EmptyState({ icon: Icon, iconBg, iconFg, title, description, action, minHeight = 360 }) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        bgcolor: 'common.white',
        boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
        px: 3,
        textAlign: 'center',
        flex: 1,
        minHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Stack spacing={2} sx={{ alignItems: 'center', maxWidth: 400, mx: 'auto' }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon sx={{ color: iconFg, fontSize: 26 }} />
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: 'text.primary' }}>{title}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', mt: 0.5 }}>{description}</Typography>
        </Box>

        {action}
      </Stack>
    </Paper>
  );
}

export default EmptyState;

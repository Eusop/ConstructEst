import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import { colors } from '../../../theme/palette';

/**
 * Shown on the Projects page when no projects have been created yet.
 */
function EmptyProjectsState() {
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
        minHeight: 420,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Stack spacing={2} sx={{ alignItems: 'center', maxWidth: 360, mx: 'auto' }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: colors.iconBlueBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FolderRoundedIcon sx={{ color: colors.iconBlueFg, fontSize: 26 }} />
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: 'text.primary' }}>No projects yet.</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', mt: 0.5 }}>
            Create your first project to begin estimating construction materials.
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export default EmptyProjectsState;

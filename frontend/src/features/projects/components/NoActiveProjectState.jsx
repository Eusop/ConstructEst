import { Link as RouterLink } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { ROUTES } from '../../../routes/paths';
import { colors } from '../../../theme/palette';

/**
 * Shared guard shown at the top of every workspace page (Material
 * Estimation, Store Locator, Brand Selection, Bill of Materials) when
 * there's no active project — e.g. direct navigation to the URL, or after
 * deleting the active project.
 */
function NoActiveProjectState() {
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
      <Stack spacing={2} sx={{ alignItems: 'center', maxWidth: 400, mx: 'auto' }}>
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
          <FolderOpenRoundedIcon sx={{ color: colors.iconBlueFg, fontSize: 26 }} />
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: 'text.primary' }}>
            No project selected
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', mt: 0.5 }}>
            Select an active project from Projects, or create a new one, to view its material
            estimation, store, brand selection, and bill of materials.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: '100%', justifyContent: 'center' }}>
          <Button
            component={RouterLink}
            to={ROUTES.PROJECTS}
            variant="outlined"
            sx={{
              color: 'text.primary',
              borderColor: 'grey.300',
              '&:hover': { borderColor: 'grey.400', bgcolor: 'grey.50' },
            }}
          >
            Go to Projects
          </Button>
          <Button
            component={RouterLink}
            to={ROUTES.NEW_PROJECT}
            variant="contained"
            disableElevation
            startIcon={<AddRoundedIcon />}
            sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
          >
            Create New Project
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default NoActiveProjectState;

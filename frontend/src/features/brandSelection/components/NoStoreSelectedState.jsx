import { Link as RouterLink } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { ROUTES } from '../../../routes/paths';
import { colors } from '../../../theme/palette';

/**
 * Shown on Brand Selection when the active project has no store chosen yet
 * — the available brands/prices come from the selected store's catalog
 * (see getStoreBrandOptions), so Automatic/Manual mode and the material
 * grid have nothing meaningful to render until one is picked.
 */
function NoStoreSelectedState() {
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
            bgcolor: colors.iconOrangeBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <StorefrontRoundedIcon sx={{ color: colors.iconOrangeFg, fontSize: 26 }} />
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: 'text.primary' }}>
            Please select a hardware store first.
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', mt: 0.5 }}>
            The available brands and prices depend on the hardware store you choose. Select one from
            Store Locator to continue.
          </Typography>
        </Box>

        <Button
          component={RouterLink}
          to={ROUTES.STORE_LOCATOR}
          variant="contained"
          disableElevation
          endIcon={<ArrowForwardRoundedIcon />}
          sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
        >
          Go to Store Locator
        </Button>
      </Stack>
    </Paper>
  );
}

export default NoStoreSelectedState;

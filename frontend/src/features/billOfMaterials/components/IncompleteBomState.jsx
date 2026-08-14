import { useNavigate } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { colors } from '../../../theme/palette';

/**
 * Shown on Bill of Materials when the active project exists but hasn't
 * finished the steps a BOM depends on (material estimation, then a
 * selected hardware store — brand selection already defaults to a
 * recommended brand, so no further step is required after that). "Continue
 * Estimation" routes to whichever of those steps is still outstanding.
 */
function IncompleteBomState({ nextRoute }) {
  const navigate = useNavigate();

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
          <DescriptionRoundedIcon sx={{ color: colors.iconOrangeFg, fontSize: 26 }} />
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: 'text.primary' }}>
            Finish the steps to generate your Bill of Materials
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', mt: 0.5 }}>
            Complete the material estimation and select a hardware store for this project before
            generating the BOM.
          </Typography>
        </Box>

        <Button
          onClick={() => navigate(nextRoute)}
          variant="contained"
          disableElevation
          endIcon={<ArrowForwardRoundedIcon />}
          sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
        >
          Continue Estimation
        </Button>
      </Stack>
    </Paper>
  );
}

export default IncompleteBomState;

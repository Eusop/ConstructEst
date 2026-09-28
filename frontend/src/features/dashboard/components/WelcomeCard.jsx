import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import WavingHandRoundedIcon from '@mui/icons-material/WavingHandRounded';
import { useUser } from '../../../context/UserContext';
import { colors } from '../../../theme/palette';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate() {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'short' });
  const month = now.toLocaleDateString('en-US', { month: 'long' });
  return `${weekday}, ${now.getDate()} ${month} ${now.getFullYear()}`;
}

/**
 * Dashboard greeting card: a time-of-day greeting and today's date. It is a
 * short, wide bar full width above the stat cards at every breakpoint, styled
 * differently from them (brand-orange gradient, white text) so it reads as a
 * header, not a fifth metric. Both gradient stops stay in the darker half of
 * the orange (orange to orangeDark) so white text keeps contrast. The icon tile
 * and text sit to the left, left-aligned. Both lines show on phones too and
 * wrap if the viewport is narrow.
 */
function WelcomeCard() {
  const { userName } = useUser();

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        p: { xs: 2, sm: 2.5 },
        background: `linear-gradient(135deg, ${colors.orange} 0%, ${colors.orangeDark} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
      }}
    >
      <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Box
          sx={{
            width: { xs: 38, sm: 44 },
            height: { xs: 38, sm: 44 },
            flexShrink: 0,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.16)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <WavingHandRoundedIcon sx={{ color: 'common.white', fontSize: { xs: 19, sm: 22 } }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.25rem' }, color: 'common.white' }}>
            {getGreeting()}
            {userName ? `, ${userName}` : ''}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.82)', fontSize: { xs: '0.8rem', sm: '0.85rem' }, mt: 0.25 }}>
            Your estimation overview: {getFormattedDate()}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export default WelcomeCard;

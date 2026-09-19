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
 * Dashboard greeting card: time-of-day greeting + today's date. Sits full
 * width above the three project stat cards (see DashboardPage) at every
 * breakpoint — deliberately a short, wide bar rather than a tall block, and
 * styled apart from the plain white StatCards below it (a brand-orange
 * gradient instead of white, white text instead of the usual text.primary/
 * text.secondary pair) so it reads as the dashboard's welcoming header
 * rather than a fifth metric tile. Both stops of the gradient stay within
 * the darker half of the brand's orange (orange -> orangeDark) so white text
 * keeps strong contrast across the whole card, not just at one corner.
 *
 * The icon-tile-plus-text group sits toward the left of the card (the
 * Paper's own padding is what keeps it off the edge, not extra margin),
 * with each line of text left-aligned against the other — the horizontal
 * room this card has now goes toward that left column, not toward a
 * taller card or bigger type. Both lines of text are always shown, phones
 * included: unlike the project stat cards
 * (which do get a phone-specific compact treatment, see StatCard's `dense`
 * prop), the greeting and date read fine at a modest phone type scale
 * without needing to drop anything, and wrap naturally if the viewport is
 * narrow enough that they don't fit on one line.
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

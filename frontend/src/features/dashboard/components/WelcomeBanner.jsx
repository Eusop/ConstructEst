import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useUser } from '../../../context/UserContext';

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
 * Dashboard greeting banner: time-of-day greeting + today's date, styled
 * to match the reference design.
 */
function WelcomeBanner() {
  const { userName } = useUser();

  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: 'text.primary' }}>
        {getGreeting()}
        {userName ? `, ${userName}` : ''}
      </Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
        Your estimation overview — {getFormattedDate()}
      </Typography>
    </Box>
  );
}

export default WelcomeBanner;

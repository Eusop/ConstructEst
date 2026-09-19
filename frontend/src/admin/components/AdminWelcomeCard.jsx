import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import WavingHandRoundedIcon from '@mui/icons-material/WavingHandRounded';
import { colors } from '../../theme/palette';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate() {
  const now = new Date();
  return now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Admin dashboard greeting card — the Admin Module's counterpart to the User
 * Module's WelcomeCard (see features/dashboard/components/WelcomeCard),
 * kept as its own component rather than reused directly because the text
 * differs: this always reads "..., Admin" (there's no per-admin display
 * name shown here, unlike the User Module's real userName) and keeps the
 * Admin Dashboard's own existing date format (`Sat, September 19, 2026` —
 * month before day) rather than the User Module's (`Sat, 19 September
 * 2026`). Everything else — the orange gradient, icon treatment, sizing,
 * spacing, and border radius — is copied byte-for-byte from WelcomeCard's
 * current design (both its `sm`+ values, used in this dashboard's unchanged
 * desktop/tablet 2x2 grid, and its `xs` values, used when AdminDashboardPage
 * renders this full-width on phones instead) so the two dashboards' top-left
 * card read as the same design at every breakpoint. In particular, the
 * phone subtitle is no longer dropped (WelcomeCard stopped doing that too)
 * and content is left-aligned rather than centered, matching WelcomeCard's
 * own current layout.
 */
function AdminWelcomeCard() {
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
            {getGreeting()}, Admin
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.82)', fontSize: { xs: '0.8rem', sm: '0.85rem' }, mt: 0.25 }}>
            System overview: {getFormattedDate()}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export default AdminWelcomeCard;

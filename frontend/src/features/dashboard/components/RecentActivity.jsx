import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/**
 * Dashboard "Recent activity" card: an icon tile, a message, and a
 * right-aligned relative timestamp per entry. Shows a placeholder message
 * when there's nothing to list. The card has its own fixed height — the
 * title stays pinned, and only the activity list scrolls internally once
 * it outgrows that space, instead of growing the card taller.
 *
 * @param {object} props
 * @param {Array<{id: number|string, icon: React.ElementType, iconBg: string,
 *   iconFg: string, message: string, timestamp: string}>} props.activities
 */
function RecentActivity({ activities }) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        p: 3,
        bgcolor: 'common.white',
        boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
        height: { xs: 230, md: 240 },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5, flexShrink: 0 }}>
        Recent activity
      </Typography>
      <Divider sx={{ flexShrink: 0 }} />

      {activities.length === 0 ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ color: 'text.secondary', textAlign: 'center' }}>No recent activity yet.</Typography>
        </Box>
      ) : (
        <Stack
          divider={<Divider />}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            pr: 0.5,
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 999 },
            '&::-webkit-scrollbar-thumb:hover': { bgcolor: 'grey.400' },
          }}
        >
          {activities.map((activity) => {
            const Icon = activity.icon;
            return (
              <Stack key={activity.id} direction="row" spacing={1.25} sx={{ alignItems: 'center', py: { xs: 1.1, sm: 1.5 } }}>
                <Box
                  sx={{
                    width: { xs: 28, sm: 32 },
                    height: { xs: 28, sm: 32 },
                    flexShrink: 0,
                    borderRadius: 1.5,
                    bgcolor: activity.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon sx={{ color: activity.iconFg, fontSize: { xs: 15, sm: 18 } }} />
                </Box>

                {/* Below `sm`: message gets the full row width and the
                    timestamp moves to its own smaller line underneath —
                    previously both shared one row at the default 1rem body
                    text size with no wrap accommodation, so a normal-length
                    message wrapped 3-4 lines and only one activity fit in
                    the card at all. `sm`+ keeps the original single-row
                    layout untouched. */}
                <Box sx={{ display: { xs: 'block', sm: 'none' }, flex: 1, minWidth: 0 }}>
                  <Typography sx={{ color: 'text.primary', fontSize: '0.82rem', lineHeight: 1.35 }}>
                    {activity.message}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem', mt: 0.25 }}>
                    {activity.timestamp}
                  </Typography>
                </Box>

                <Typography sx={{ display: { xs: 'none', sm: 'block' }, color: 'text.primary', flex: 1 }}>
                  {activity.message}
                </Typography>
                <Typography sx={{ display: { xs: 'none', sm: 'block' }, color: 'text.secondary', fontSize: '0.8rem', flexShrink: 0 }}>
                  {activity.timestamp}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}

export default RecentActivity;

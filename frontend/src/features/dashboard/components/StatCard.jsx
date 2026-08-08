import { Link as RouterLink } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import { colors } from '../../../theme/palette';

/**
 * Reusable dashboard summary card: an icon tile, a label, and a value —
 * plus an optional "View All" link in the top-right corner.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {React.ElementType} props.icon Icon component rendered inside the tile.
 * @param {string} props.iconBg Icon tile background colour.
 * @param {string} props.iconFg Icon colour.
 * @param {React.ReactNode} props.value
 * @param {string} [props.viewAllTo] Route to link to; omit to hide the "View All" link.
 */
function StatCard({ label, icon: Icon, iconBg, iconFg, value, viewAllTo }) {
  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        borderRadius: 3,
        p: 2.5,
        bgcolor: 'common.white',
        boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
      }}
    >
      {viewAllTo && (
        <Link
          component={RouterLink}
          to={viewAllTo}
          underline="hover"
          sx={{
            position: 'absolute',
            top: 14,
            right: 16,
            fontSize: '0.78rem',
            fontWeight: 600,
            color: colors.accentBlue,
          }}
        >
          View All
        </Link>
      )}

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: 2,
            bgcolor: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon sx={{ color: iconFg, fontSize: 22 }} />
        </Box>
        <Box sx={{ minWidth: 0, pr: viewAllTo ? 6.5 : 0 }}>
          <Typography noWrap sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 0.25 }}>
            {label}
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: 'text.primary' }}>
            {value}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export default StatCard;

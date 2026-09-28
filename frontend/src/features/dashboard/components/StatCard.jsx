import { Link as RouterLink } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { colors } from '../../../theme/palette';

/**
 * Dashboard summary card in two sections: a colored icon panel on the left
 * (`iconBg`, full card height) and the label and value on a white panel on
 * the right. The outer card clips both to one rounded rectangle
 * (`overflow: hidden`), so the seam between them stays a flat edge. The
 * border and shadow are a bit stronger than the usual card shadow, since the
 * white right panel sat on a near-white page background and blended in. Also
 * has an optional "View All" link in the top-right (text on tablet/desktop, a
 * small eye icon on phones when `dense` or `iconOnMobile` is set).
 *
 * @param {object} props
 * @param {string} props.label
 * @param {React.ElementType} props.icon Icon component rendered in the left panel.
 * @param {string} props.iconBg Left panel background colour.
 * @param {string} props.iconFg Icon colour.
 * @param {React.ReactNode} props.value
 * @param {string} [props.viewAllTo] Route to link to; omit to hide the "View All" link.
 * @param {boolean} [props.dense] Tighter padding, icon and type on phones (`xs`) only, for a 2-per-row grid. `sm`+ is unchanged. No dashboard uses it now (both use the phone carousel); kept for a future denser layout. Also switches the phone "View All" to the eye icon.
 * @param {boolean} [props.iconOnMobile] Swaps "View All" for the eye icon on phones without changing sizes (used by the mobile carousel, where cards are nearly full width).
 */
function StatCard({ label, icon: Icon, iconBg, iconFg, value, viewAllTo, dense = false, iconOnMobile = false }) {
  const showMobileIcon = dense || iconOnMobile;
  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        display: 'flex',
        alignItems: 'stretch',
        bgcolor: 'common.white',
        border: '1px solid',
        borderColor: 'rgba(20, 30, 60, 0.08)',
        boxShadow: '0 4px 16px rgba(20, 30, 60, 0.10)',
      }}
    >
      {viewAllTo && (
        <>
          {/* Phones only, when `showMobileIcon` (`dense` or `iconOnMobile`): a small tappable
              eye icon instead of the "View All" text, which needs more width. The
              IconButton's padding keeps it easy to tap. */}
          <Tooltip title="View All">
            <IconButton
              component={RouterLink}
              to={viewAllTo}
              aria-label="View All"
              size="small"
              sx={{
                display: { xs: showMobileIcon ? 'inline-flex' : 'none', sm: 'none' },
                position: 'absolute',
                top: 6,
                right: 6,
                color: colors.accentBlue,
              }}
            >
              <VisibilityRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          {/* Tablet/desktop always, and phones when `showMobileIcon` is false:
              the "View All" text link. */}
          <Link
            component={RouterLink}
            to={viewAllTo}
            underline="hover"
            sx={{
              display: { xs: showMobileIcon ? 'none' : 'inline-flex', sm: 'inline-flex' },
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
        </>
      )}

      {/* Left: the colored panel. Its width follows the right panel's padding
          scale (icon size plus two paddings), so the icon keeps its usual room. */}
      <Box
        sx={{
          flexShrink: 0,
          width: { xs: dense ? 52 : 70, sm: 84 },
          bgcolor: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon sx={{ color: iconFg, fontSize: { xs: dense ? 20 : 24, sm: 28 } }} />
      </Box>

      {/* Right: label and value on white, vertically centered against the icon panel. */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          p: { xs: dense ? 1.25 : 2, sm: 2.5 },
          pr: viewAllTo ? { xs: showMobileIcon ? 3.5 : 6.5, sm: 6.5 } : undefined,
        }}
      >
        {/* `noWrap` (single line with ellipsis) is what this label always used and
            stays at `sm`+. On a dense phone card there isn't room for e.g.
            "Completed Projects" on one line, so that slot may wrap. */}
        <Typography
          sx={{
            color: 'text.secondary',
            fontSize: { xs: dense ? '0.7rem' : '0.78rem', sm: '0.85rem' },
            mb: 0.25,
            whiteSpace: { xs: dense ? 'normal' : 'nowrap', sm: 'nowrap' },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </Typography>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: dense ? '1.05rem' : '1.3rem', sm: '1.5rem' }, color: 'text.primary' }}>
          {value}
        </Typography>
      </Box>
    </Paper>
  );
}

export default StatCard;

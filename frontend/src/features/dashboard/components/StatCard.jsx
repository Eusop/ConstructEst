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
 * Reusable dashboard summary card, split into two sections: a colored icon
 * panel on the left (filled with `iconBg`, the same tint every icon tile in
 * the app already pairs with `iconFg` — just extended to the full height of
 * the card instead of a small inset tile, so the color reads as part of the
 * card's own structure rather than a floating chip) and the label/value on
 * a plain white panel to its right. The outer card clips both to one
 * rounded rectangle (`overflow: hidden`), so the left panel is only ever
 * rounded on its own outer corners — the seam between the two stays a
 * flat edge, not a second boxed shape (there's a border around the whole
 * card, see below, but never between its two internal sections).
 *
 * The border + shadow together are deliberately a bit more present than
 * this app's usual `0 2px 10px rgba(20,30,60,0.06)` card shadow (used
 * elsewhere against a plain white page background) — this card's colored
 * left panel already provides some contrast, but the plain-white right
 * panel sat directly on the dashboard's pale-blue page background
 * (`heroBackground`, close to white itself) with nothing but that faint
 * shadow separating the two, so the card read as blending into the page
 * rather than sitting on top of it. Both stay soft/diffuse, not a hard or
 * dramatic elevation.
 *
 * Also carries an optional "View All" affordance in the top-right corner
 * (text on tablet/desktop; a small eye icon on phones whenever `dense` or
 * `iconOnMobile` is set, see below) — that's positioned against the card as
 * a whole, so it lands on the white section regardless.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {React.ElementType} props.icon Icon component rendered in the left panel.
 * @param {string} props.iconBg Left panel background colour.
 * @param {string} props.iconFg Icon colour.
 * @param {React.ReactNode} props.value
 * @param {string} [props.viewAllTo] Route to link to; omit to hide the "View All" link.
 * @param {boolean} [props.dense] Tighter padding/icon/type sizes on phones only (`xs`) —
 *   for a 2-per-row grid instead of this card's usual full-width phone layout. `sm` and up
 *   are untouched either way, so tablet/desktop looks identical regardless of this flag.
 *   Not currently used by either dashboard (both use the full-width phone carousel — see
 *   ProjectStatsSection — instead of a 2-per-row phone grid), kept for any future card
 *   that does need that denser phone layout. Also switches the phone "View All" to the eye
 *   icon (see `iconOnMobile` below) — a dense card is always narrow enough to need it.
 * @param {boolean} [props.iconOnMobile] Independent of `dense`: swaps "View All" for the
 *   eye icon on phones without touching padding/icon/type sizing. For a phone context
 *   that isn't a cramped 2-per-row cell — e.g. both dashboards' mobile carousel, where each
 *   card gets nearly the full viewport width — but should still use the same compact icon
 *   affordance rather than a wider text link.
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
          {/* Phones only, and only when `showMobileIcon` (`dense` or
              `iconOnMobile`): a small tappable eye icon instead of the
              "View All" text, so it reads as "view" without needing the
              width a text link would take. IconButton's own hit-area
              padding keeps this easy to tap even though the eye glyph
              itself stays small. */}
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

          {/* Tablet/desktop always, and phones only when `showMobileIcon` is
              false — unchanged "View All" text link. */}
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

      {/* Left: the colored panel. Width is deliberately tied to the same
          padding scale the right panel uses below (icon size + two lots of
          that padding), so the icon keeps the exact same breathing room
          around it that it always has — this section is proportioned off
          existing spacing tokens rather than an arbitrary fraction of the
          card. */}
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

      {/* Right: label + value on white, vertically centered against the
          icon panel's height. */}
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
        {/* `noWrap` (an ellipsis-on-overflow single line) is what this label
            used everywhere before `dense` existed — kept byte-for-byte at
            `sm`+ regardless of `dense`. At a dense phone width there isn't
            room for e.g. "Completed Projects" on one line without
            truncating it into nonsense, so that one slot allows a normal
            wrap instead. */}
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

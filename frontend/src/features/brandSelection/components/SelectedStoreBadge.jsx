import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import { colors } from '../../../theme/palette';

/**
 * Small pill showing which store Brand Selection's prices are quoted against
 * (chosen on Store Locator). Renders nothing if no store is selected. Hidden
 * below `sm`: on narrow phones there's no room next to the page title, and the
 * store is still shown in the page body.
 *
 * @param {object} props
 * @param {string} [props.storeName]
 */
function SelectedStoreBadge({ storeName }) {
  if (!storeName) return null;

  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{
        display: { xs: 'none', sm: 'flex' },
        alignItems: 'center',
        bgcolor: colors.iconBlueBg,
        color: colors.iconBlueFg,
        borderRadius: 999,
        px: 1.5,
        py: 0.6,
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      <StorefrontRoundedIcon sx={{ fontSize: 16, flexShrink: 0 }} />
      <Typography
        sx={{
          fontSize: '0.8rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: { sm: 160, md: 220 },
        }}
      >
        {storeName}
      </Typography>
    </Stack>
  );
}

export default SelectedStoreBadge;

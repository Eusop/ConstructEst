import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { PRIORITY_LABELS } from '../data/priority';
import { colors } from '../../../theme/palette';

/**
 * The user's ranking of floor area, storeys and budget (1 = most important),
 * used by Explore search. The up arrow moves one higher.
 *
 * @param {object} props
 * @param {string[]} props.order
 * @param {(order: string[]) => void} props.onChange
 * @param {boolean} [props.disabled]
 */
function PriorityPicker({ order, onChange, disabled = false }) {
  const moveUp = (index) => {
    const next = [...order];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
      {order.map((param, index) => (
        <Stack
          key={param}
          direction="row"
          spacing={0.75}
          sx={{ alignItems: 'center', bgcolor: colors.heroBackground, borderRadius: 2, pl: 1.25, pr: 0.5, py: 0.25, minHeight: 36 }}
        >
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: colors.accentBlue }}>{index + 1}</Typography>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.primary', flex: 1 }}>{PRIORITY_LABELS[param]}</Typography>
          <Tooltip title={index === 0 ? 'Already most important' : 'Move up'}>
            <span>
              <IconButton
                size="small"
                aria-label={`Move ${PRIORITY_LABELS[param]} up`}
                disabled={disabled || index === 0}
                onClick={() => moveUp(index)}
              >
                {/* The app's chevron, turned to point up. */}
                <ExpandMoreRoundedIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ))}
    </Stack>
  );
}

export default PriorityPicker;

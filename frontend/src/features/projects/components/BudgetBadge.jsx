import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { colors } from '../../../theme/palette';

/**
 * Small pill badge showing whether a cost is within or over its budget
 * ceiling.
 *
 * @param {object} props
 * @param {boolean} props.withinBudget
 */
function BudgetBadge({ withinBudget }) {
  const bg = withinBudget ? colors.iconGreenBg : colors.iconRedBg;
  const fg = withinBudget ? colors.iconGreenFg : colors.iconRedFg;

  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{ alignItems: 'center', bgcolor: bg, color: fg, borderRadius: 999, px: 1.5, py: 0.5, flexShrink: 0 }}
    >
      <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>{withinBudget ? 'Within budget' : 'Over budget'}</Typography>
    </Stack>
  );
}

export default BudgetBadge;

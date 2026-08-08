import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { colors } from '../../../theme/palette';

const ICON_SIZE = 26;

function StepStatusIcon({ status, Icon }) {
  if (status === 'done') {
    return (
      <Box
        sx={{
          width: ICON_SIZE,
          height: ICON_SIZE,
          borderRadius: '50%',
          bgcolor: colors.iconGreenFg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <CheckRoundedIcon sx={{ color: 'common.white', fontSize: 16 }} />
      </Box>
    );
  }

  if (status === 'active') {
    return (
      <Box
        sx={{
          width: ICON_SIZE,
          height: ICON_SIZE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <CircularProgress size={ICON_SIZE} thickness={5} sx={{ color: colors.accentBlue }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: ICON_SIZE,
        height: ICON_SIZE,
        borderRadius: '50%',
        bgcolor: 'grey.100',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon sx={{ color: 'grey.400', fontSize: 15 }} />
    </Box>
  );
}

/**
 * Vertical timeline of parsing steps: a connecting line runs through each
 * status icon, with completed steps checked off, the current one spinning,
 * and the rest pending.
 *
 * @param {object} props
 * @param {Array<{key: string, title: string, subtitle: string, icon: React.ElementType}>} props.steps
 * @param {number} props.activeIndex Index of the currently in-progress step.
 */
function ParsingChecklist({ steps, activeIndex }) {
  return (
    <Stack spacing={0}>
      {steps.map((step, index) => {
        const status = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending';
        const isLast = index === steps.length - 1;

        return (
          <Stack key={step.key} direction="row" spacing={1.5}>
            <Stack sx={{ alignItems: 'center' }}>
              <StepStatusIcon status={status} Icon={step.icon} />
              {!isLast && (
                <Box sx={{ width: 2, flex: 1, minHeight: 22, my: 0.5, bgcolor: status === 'done' ? colors.iconGreenFg : 'grey.200' }} />
              )}
            </Stack>
            <Box sx={{ pb: isLast ? 0 : 2.25 }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: status === 'pending' ? 'text.secondary' : status === 'active' ? colors.accentBlue : 'text.primary',
                }}
              >
                {step.title}
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{step.subtitle}</Typography>
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}

export default ParsingChecklist;

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { getPasswordStrength } from '../utils/validators';
import { colors } from '../theme/palette';

const LABEL_COLOR = {
  Weak: colors.iconRedFg,
  Fair: colors.orange,
  Strong: colors.iconGreenFg,
};

/**
 * Live password strength rating — a segmented bar + Weak/Fair/Strong label,
 * derived from the same 5 criteria `isStrongPassword` requires to actually
 * pass (see utils/validators.js's getPasswordStrength). Shows nothing for
 * an empty field — there's nothing to rate yet, and an empty red/weak bar
 * would just look like an error before the user has typed anything.
 *
 * @param {object} props
 * @param {string} props.password
 */
function PasswordStrengthMeter({ password }) {
  if (!password) return null;

  const { metCount, total, label } = getPasswordStrength(password);
  const barColor = LABEL_COLOR[label];

  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.75 }}>
      <Stack direction="row" spacing={0.5} sx={{ flex: 1 }}>
        {Array.from({ length: total }, (_, index) => (
          <Box
            key={index}
            sx={{
              flex: 1,
              height: 4,
              borderRadius: 999,
              bgcolor: index < metCount ? barColor : 'grey.200',
              transition: 'background-color 0.15s ease',
            }}
          />
        ))}
      </Stack>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: barColor, minWidth: 40, textAlign: 'right' }}>
        {label}
      </Typography>
    </Stack>
  );
}

export default PasswordStrengthMeter;

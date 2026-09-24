import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import FormTextField from './FormTextField';

/**
 * Reusable password input — a FormTextField locked to type="password".
 * Forwards every other prop (value, onChange, name, error, helperText, etc.).
 *
 * @param {object} props
 * @param {boolean} [props.showToggle=false] Show a visibility toggle icon
 *   to reveal/hide the typed password. Off by default so existing usages
 *   are unaffected.
 */
function PasswordField({ showToggle = false, sx, ...rest }) {
  const [visible, setVisible] = useState(false);

  if (!showToggle) {
    return <FormTextField type="password" sx={sx} {...rest} />;
  }

  return (
    <FormTextField
      type={visible ? 'text' : 'password'}
      // Edge draws its own reveal (eye) button inside every password input;
      // with this component's own toggle that showed two eye icons side by
      // side. Hide the browser's so only ours remains.
      sx={[
        { '& input::-ms-reveal, & input::-ms-clear': { display: 'none' } },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      endAdornment={
        <IconButton
          onClick={() => setVisible((prev) => !prev)}
          edge="end"
          size="small"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
        </IconButton>
      }
      {...rest}
    />
  );
}

export default PasswordField;

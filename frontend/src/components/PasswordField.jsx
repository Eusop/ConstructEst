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
function PasswordField({ showToggle = false, ...rest }) {
  const [visible, setVisible] = useState(false);

  if (!showToggle) {
    return <FormTextField type="password" {...rest} />;
  }

  return (
    <FormTextField
      type={visible ? 'text' : 'password'}
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

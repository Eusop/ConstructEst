import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import FormTextField from './FormTextField';

/**
 * Password input: a FormTextField locked to type="password". Other props
 * (value, onChange, name, error, helperText, etc.) are forwarded.
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
      // Edge adds its own reveal (eye) button, which showed two eyes next to
      // this component's toggle. Hide the browser's.
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

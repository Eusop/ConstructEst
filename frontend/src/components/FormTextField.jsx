import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

/**
 * Reusable outlined text field with the ConstructEst form styling
 * (full width, placeholder-driven, rounded borders from the theme).
 *
 * Forwards every extra prop straight to MUI's TextField, so it stays as
 * flexible as the underlying component (value, onChange, type, name, etc.).
 *
 * @param {object} props
 * @param {string} [props.placeholder] Placeholder text shown inside the field.
 * @param {React.ReactNode} [props.icon] Optional leading icon rendered inside the field.
 * @param {React.ReactNode} [props.endAdornment] Optional trailing adornment (e.g. a visibility toggle).
 */
function FormTextField({ placeholder, icon, endAdornment, slotProps, ...rest }) {
  const startAdornment = icon ? (
    <InputAdornment position="start">{icon}</InputAdornment>
  ) : undefined;

  return (
    <TextField
      fullWidth
      variant="outlined"
      placeholder={placeholder}
      slotProps={{
        ...slotProps,
        input: {
          ...(startAdornment ? { startAdornment } : {}),
          ...(endAdornment ? { endAdornment } : {}),
          ...slotProps?.input,
        },
      }}
      {...rest}
    />
  );
}

export default FormTextField;

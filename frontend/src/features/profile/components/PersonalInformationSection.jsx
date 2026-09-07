import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormTextField from '../../../components/FormTextField';

const FIELD_LABEL_SX = { fontWeight: 600, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 };

/**
 * "Personal Information" section body: editable Full Name and Email
 * Address, plus a read-only Employee ID — matching Admin's own Edit User
 * dialog, where Employee ID is disabled once a user exists (it's the login
 * identifier; the backend's updateProfile endpoint doesn't accept renaming
 * it either).
 *
 * @param {object} props
 * @param {{fullName: string, employeeId: string, email: string}} props.form
 * @param {object} props.errors
 * @param {object} props.touched
 * @param {(field: string, value: string) => void} props.onFieldChange
 * @param {(field: string) => void} props.onFieldBlur
 */
function PersonalInformationSection({ form, errors, touched, onFieldChange, onFieldBlur }) {
  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={FIELD_LABEL_SX}>Full Name</Typography>
          <FormTextField
            name="fullName"
            autoComplete="off"
            value={form.fullName}
            onChange={(event) => onFieldChange('fullName', event.target.value)}
            onBlur={() => onFieldBlur('fullName')}
            error={Boolean(touched.fullName && errors.fullName)}
            helperText={(touched.fullName && errors.fullName) || ' '}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={FIELD_LABEL_SX}>Employee ID</Typography>
          <FormTextField
            name="employeeId"
            autoComplete="off"
            value={form.employeeId}
            disabled
            helperText="Employee ID cannot be changed"
          />
        </Box>
      </Stack>

      <Box>
        <Typography sx={FIELD_LABEL_SX}>Email Address</Typography>
        <FormTextField
          name="email"
          type="email"
          autoComplete="off"
          value={form.email}
          onChange={(event) => onFieldChange('email', event.target.value)}
          onBlur={() => onFieldBlur('email')}
          error={Boolean(touched.email && errors.email)}
          helperText={(touched.email && errors.email) || ' '}
        />
      </Box>
    </Stack>
  );
}

export default PersonalInformationSection;

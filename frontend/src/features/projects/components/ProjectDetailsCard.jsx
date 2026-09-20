import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import FormTextField from '../../../components/FormTextField';
import DxfDropzone from './DxfDropzone';
import { colors } from '../../../theme/palette';

// Mirrors BrandModeToggle's pill-track segmented-control styling, for a
// consistent look between the two two-option toggles in the app.
const STOREYS_TOGGLE_SX = {
  bgcolor: 'grey.100',
  borderRadius: 999,
  p: 0.5,
  '& .MuiToggleButtonGroup-grouped': {
    border: 0,
    borderRadius: 999,
    textTransform: 'none',
    fontWeight: 700,
    fontSize: '0.85rem',
    color: 'text.secondary',
    px: 2,
    '&.Mui-selected': {
      bgcolor: 'common.white',
      color: colors.accentBlue,
      boxShadow: '0 1px 4px rgba(20, 30, 60, 0.12)',
      '&:hover': { bgcolor: 'common.white' },
    },
  },
};

const FIELD_LABEL_SX = { fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.85rem' }, color: 'text.primary', mb: { xs: 0.5, sm: 0.75 } };

// Strips everything but digits as the user types, then reformats with
// thousands separators — keeps the stored value a clean numeric string
// (e.g. "1,600,000") while making it impossible to enter letters/symbols.
function formatBudgetInput(rawValue) {
  const digitsOnly = rawValue.replace(/[^\d]/g, '');
  if (!digitsOnly) return '';
  return Number(digitsOnly).toLocaleString('en-PH');
}

/**
 * "Project details" card: name, location, budget ceiling, storeys (1/2) and
 * include-roofing toggles, the floor plan DXF dropzone (with its own
 * preview once a file validates), an optional second-floor DXF dropzone
 * (shown only for a 2-storey project — see DxfDropzone/ProjectsContext's
 * secondFloorFile), and the Cancel / Create & parse DXF actions at the
 * bottom. The submit button relies on being a descendant of the page's
 * <form> (see NewProjectPage) rather than owning its own submit handling.
 *
 * @param {object} props
 * @param {object} props.form Current form values (projectName, location, budgetCeiling, storeys, includeRoofing, file, secondFloorFile).
 * @param {(field: string, value: unknown) => void} props.onFieldChange
 * @param {{name: string, sizeLabel: string} | null} props.file Currently attached file.
 * @param {object} props.fileValidation Current DXF validation state (see DxfDropzone).
 * @param {(file: {name: string, sizeLabel: string}) => void} props.onFileSelect
 * @param {() => void} props.onFileRemove
 * @param {(result: object) => void} props.onFileValidation
 * @param {object} props.secondFloorFileValidation Same shape as `fileValidation`, for the optional second-floor dropzone (only rendered when `form.storeys === 2`).
 * @param {(file: {name: string, sizeLabel: string}) => void} props.onSecondFloorFileSelect
 * @param {() => void} props.onSecondFloorFileRemove
 * @param {(result: object) => void} props.onSecondFloorFileValidation
 * @param {() => void} props.onCancel
 * @param {{projectName?: string, location?: string, budgetCeiling?: string}} props.errors
 *   Validation messages per field, keyed the same as `form`.
 * @param {{projectName?: boolean, location?: boolean, budgetCeiling?: boolean}} props.touched
 *   Which required fields the user has already left (blurred) — errors only
 *   show for touched fields, so a fresh empty form doesn't look broken.
 * @param {(field: string) => void} props.onFieldBlur
 * @param {boolean} props.canSubmit Whether every required field is valid and the DXF (and, if attached, the second-floor DXF) has validated — gates the submit button.
 */
function ProjectDetailsCard({
  form,
  onFieldChange,
  fileValidation,
  onFileSelect,
  onFileRemove,
  onFileValidation,
  secondFloorFileValidation,
  onSecondFloorFileSelect,
  onSecondFloorFileRemove,
  onSecondFloorFileValidation,
  onCancel,
  errors,
  touched,
  onFieldBlur,
  canSubmit,
}) {
  return (
    <Paper
      elevation={0}
      sx={{ borderRadius: 3, bgcolor: 'common.white', boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)', p: { xs: 1.75, sm: 2, md: 3.5 } }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.1rem' }, color: 'text.primary' }}>Project details</Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.78rem', sm: '0.85rem' }, mb: { xs: 2, sm: 3 } }}>
        Residential estimate from a 2D AutoCAD DXF.
      </Typography>

      <Stack spacing={{ xs: 1.75, sm: 2.5 }}>
        <Box>
          <Typography sx={FIELD_LABEL_SX}>Project name</Typography>
          <FormTextField
            name="projectName"
            autoComplete="off"
            value={form.projectName}
            onChange={(event) => onFieldChange('projectName', event.target.value)}
            onBlur={() => onFieldBlur('projectName')}
            placeholder="Villa Aurora"
            error={Boolean(touched.projectName && errors.projectName)}
            helperText={(touched.projectName && errors.projectName) || ' '}
          />
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.75, sm: 2.5 }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={FIELD_LABEL_SX}>Location</Typography>
            <FormTextField
              name="location"
              autoComplete="off"
              value={form.location}
              onChange={(event) => onFieldChange('location', event.target.value)}
              onBlur={() => onFieldBlur('location')}
              placeholder="Tarlac City"
              error={Boolean(touched.location && errors.location)}
              helperText={(touched.location && errors.location) || ' '}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={FIELD_LABEL_SX}>Budget ceiling (₱)</Typography>
            <FormTextField
              name="budgetCeiling"
              autoComplete="off"
              icon="₱"
              value={form.budgetCeiling}
              onChange={(event) => onFieldChange('budgetCeiling', formatBudgetInput(event.target.value))}
              onBlur={() => onFieldBlur('budgetCeiling')}
              placeholder="1,600,000"
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              error={Boolean(touched.budgetCeiling && errors.budgetCeiling)}
              helperText={(touched.budgetCeiling && errors.budgetCeiling) || ' '}
            />
          </Box>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.75, sm: 2.5 }} sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>Storeys</Typography>
            <ToggleButtonGroup
              value={form.storeys}
              exclusive
              onChange={(event, value) => value !== null && onFieldChange('storeys', value)}
              sx={STOREYS_TOGGLE_SX}
            >
              <ToggleButton value={1} disableRipple>1 storey</ToggleButton>
              <ToggleButton value={2} disableRipple>2 storeys</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <FormControlLabel
            sx={{ mt: { xs: 0, sm: 2.25 } }}
            control={
              <Checkbox
                checked={form.includeRoofing}
                onChange={(event) => onFieldChange('includeRoofing', event.target.checked)}
                sx={{ color: colors.inputBorder, '&.Mui-checked': { color: colors.accentBlue } }}
              />
            }
            label={<Typography sx={{ fontSize: { xs: '0.82rem', sm: '0.88rem' }, color: 'text.primary' }}>Include roofing</Typography>}
          />
        </Stack>

        <Box>
          <Typography sx={FIELD_LABEL_SX}>Floor plan (2D AutoCAD DXF)</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.72rem', sm: '0.78rem' }, mb: 1 }}>
            This file should represent exactly one floor's geometry. A file with more than one
            floor drawn on the same layers can overstate quantities like columns and roofing.
          </Typography>
          <DxfDropzone
            file={form.file}
            fileValidation={fileValidation}
            onFileSelect={onFileSelect}
            onFileRemove={onFileRemove}
            onFileValidation={onFileValidation}
          />
        </Box>

        {form.storeys === 2 && (
          <Box>
            <Typography sx={FIELD_LABEL_SX}>Second floor plan (optional)</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.72rem', sm: '0.78rem' }, mb: 1 }}>
              Upload it for more accurate materials, or leave blank to estimate the 2nd floor from the ground
              floor.
            </Typography>
            <DxfDropzone
              file={form.secondFloorFile}
              fileValidation={secondFloorFileValidation}
              onFileSelect={onSecondFloorFileSelect}
              onFileRemove={onSecondFloorFileRemove}
              onFileValidation={onSecondFloorFileValidation}
              helperText="Second floor (optional) · standard layers (WALLS, FLOOR_AREA, ROOF)"
            />
          </Box>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 1.5 }}>
          <Button
            onClick={onCancel}
            sx={{
              flex: { xs: '1 1 auto', sm: '0 0 auto' },
              minWidth: 96,
              bgcolor: 'common.white',
              color: 'text.primary',
              border: '1px solid',
              borderColor: 'grey.300',
              '&:hover': { bgcolor: 'grey.50', borderColor: 'grey.300' },
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disableElevation
            disabled={!canSubmit}
            startIcon={<ArrowForwardRoundedIcon />}
            sx={{ flex: 1, bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
          >
            Create &amp; parse DXF
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default ProjectDetailsCard;

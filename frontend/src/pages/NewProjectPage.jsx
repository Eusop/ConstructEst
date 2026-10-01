import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import ProjectDetailsCard from '../features/projects/components/ProjectDetailsCard';
import { useProjects } from '../context/ProjectsContext';
import { useDashboardActivity } from '../context/DashboardActivityContext';
import { ROUTES } from '../routes/paths';
import { isRequired } from '../utils/validators';

function validate(draft) {
  const errors = {};

  if (!isRequired(draft.projectName)) errors.projectName = 'Project Name is required.';
  if (!isRequired(draft.location)) errors.location = 'Location is required.';

  if (!isRequired(draft.budgetCeiling)) {
    errors.budgetCeiling = 'Budget Ceiling is required.';
  } else {
    const numeric = Number(String(draft.budgetCeiling).replace(/,/g, ''));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      errors.budgetCeiling = 'Budget Ceiling must be greater than ₱0.';
    }
  }

  return errors;
}

/**
 * "New project" form: one Project details card (name, location, budget ceiling,
 * DXF upload and preview, Cancel and Create & parse DXF). Submitting creates
 * the project (making it active) and goes to the Processing page.
 *
 * Form values live in ProjectsContext's draft, which is cleared every time this
 * page opens (including clicking New Project while already here, since each
 * click is a new location.key). Field errors and "touched" state stay local.
 */
function NewProjectPage() {
  const {
    draft,
    updateDraft,
    fileValidation,
    setFileValidation,
    secondFloorFileValidation,
    setSecondFloorFileValidation,
    createProjectFromDraft,
    resetDraft,
  } = useProjects();
  const { incrementTotalProjects, logActivity } = useDashboardActivity();
  const [touched, setTouched] = useState({});
  const navigate = useNavigate();
  const { key: locationKey } = useLocation();

  useEffect(() => {
    resetDraft();
    // Deferred a tick (see MapView.jsx) instead of setting state in the effect body.
    queueMicrotask(() => setTouched({}));
  }, [locationKey, resetDraft]);

  const isFileValid = fileValidation.status === 'valid';
  // A 2-storey project needs its own second floor file. Copying the ground
  // floor gave a silent guess, so a missing or invalid file blocks submit.
  const needsSecondFloorFile = draft.storeys === 2;
  const isSecondFloorFileValid = !needsSecondFloorFile
    || (Boolean(draft.secondFloorFile) && secondFloorFileValidation.status === 'valid');
  const errors = validate(draft);
  const isFormValid = Object.keys(errors).length === 0;
  const canSubmit = isFormValid && isFileValid && isSecondFloorFileValid;
  // Only blocked while a DXF is still being read. Otherwise a click on Create
  // shows what is missing, instead of a dead button with no reason.
  const isValidatingFile = fileValidation.status === 'validating' || secondFloorFileValidation.status === 'validating';

  const handleFieldBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleCreate = (event) => {
    event.preventDefault();
    setTouched({ projectName: true, location: true, budgetCeiling: true, file: true, secondFile: true });
    if (!canSubmit) {
      // Jump to the first problem so the user sees it.
      const firstBadField = ['projectName', 'location', 'budgetCeiling'].find((field) => errors[field]);
      if (firstBadField) {
        document.querySelector(`input[name="${firstBadField}"]`)?.focus();
      } else {
        const uploadId = isFileValid ? 'second-floor-upload' : 'floor-plan-upload';
        document.getElementById(uploadId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    incrementTotalProjects();
    logActivity({ type: 'project_created', message: `New project ${draft.projectName} created` });
    createProjectFromDraft();
    navigate(ROUTES.PROJECT_PROCESSING);
  };

  return (
    <Box component="form" onSubmit={handleCreate} noValidate>
      <ProjectDetailsCard
        form={draft}
        onFieldChange={updateDraft}
        fileValidation={fileValidation}
        onFileSelect={(file) => updateDraft('file', file)}
        onFileRemove={() => updateDraft('file', null)}
        onFileValidation={setFileValidation}
        secondFloorFileValidation={secondFloorFileValidation}
        onSecondFloorFileSelect={(file) => updateDraft('secondFloorFile', file)}
        onSecondFloorFileRemove={() => updateDraft('secondFloorFile', null)}
        onSecondFloorFileValidation={setSecondFloorFileValidation}
        onCancel={() => navigate(ROUTES.PROJECTS)}
        errors={errors}
        touched={touched}
        onFieldBlur={handleFieldBlur}
        submitDisabled={isValidatingFile}
        showSubmitHint={Boolean(touched.file) && !canSubmit}
        fileMissing={Boolean(touched.file) && !draft.file}
        secondFileMissing={Boolean(touched.secondFile) && needsSecondFloorFile && !draft.secondFloorFile}
      />
    </Box>
  );
}

export default NewProjectPage;

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
  // The second floor file is optional. Empty never blocks submit, but an
  // attached invalid file does, so a bad file can't be silently dropped.
  const isSecondFloorFileValid = !draft.secondFloorFile || secondFloorFileValidation.status === 'valid';
  const errors = validate(draft);
  const isFormValid = Object.keys(errors).length === 0;
  const canSubmit = isFormValid && isFileValid && isSecondFloorFileValid;

  const handleFieldBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleCreate = (event) => {
    event.preventDefault();
    setTouched({ projectName: true, location: true, budgetCeiling: true });
    if (!canSubmit) return;
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
        canSubmit={canSubmit}
      />
    </Box>
  );
}

export default NewProjectPage;

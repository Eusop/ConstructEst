import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import ProjectDetailsCard from '../features/projects/components/ProjectDetailsCard';
import { useProjects } from '../context/ProjectsContext';
import { useDashboardActivity } from '../context/DashboardActivityContext';
import { useNotifications } from '../context/NotificationsContext';
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
 * "New project" form: a single, full-width Project details card (name,
 * location, budget ceiling, DXF upload + preview, and the Cancel / Create
 * & parse DXF actions). Frontend-only for now — submitting creates the
 * project (making it active) and navigates to the (simulated) processing
 * page instead of persisting anything for real.
 *
 * Form values live in ProjectsContext's draft rather than local state, so
 * they survive navigating to the processing page and back via Cancel parsing.
 * Field-level validation errors and "has this field been touched" state
 * stay local to this page — they're purely transient UI state, not part of
 * the draft that needs to survive navigation.
 */
function NewProjectPage() {
  const { draft, updateDraft, fileValidation, setFileValidation, createProjectFromDraft } = useProjects();
  const { incrementTotalProjects, logActivity } = useDashboardActivity();
  const { addNotification } = useNotifications();
  const [touched, setTouched] = useState({});
  const navigate = useNavigate();

  const isFileValid = fileValidation.status === 'valid';
  const errors = validate(draft);
  const isFormValid = Object.keys(errors).length === 0;
  const canSubmit = isFormValid && isFileValid;

  const handleFieldBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleCreate = (event) => {
    event.preventDefault();
    setTouched({ projectName: true, location: true, budgetCeiling: true });
    if (!canSubmit) return;
    incrementTotalProjects();
    logActivity({ type: 'project_created', message: `New project ${draft.projectName} created` });
    addNotification({
      type: 'project_created',
      title: 'Project created',
      description: `${draft.projectName} was created and is ready for a floor plan.`,
    });
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

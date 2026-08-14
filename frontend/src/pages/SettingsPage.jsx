import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import CalibrationFactorsCard from '../features/settings/components/CalibrationFactorsCard';
import NoActiveProjectState from '../features/projects/components/NoActiveProjectState';
import { SYSTEM_DEFAULT_FACTORS, loadCalibrationFactors } from '../features/settings/data/calibrationDefaults';
import { useProjects } from '../context/ProjectsContext';
import { useNotifications } from '../context/NotificationsContext';
import { apiRequest } from '../services/apiClient';
import { colors } from '../theme/palette';

function toApiShape(factors) {
  return { cementFactor: factors.cement, steelFactor: factors.steel, roofingFactor: factors.roofing, wastagePercent: factors.wastage };
}

function toUiShape(constants) {
  return { cement: constants.cementFactor, steel: constants.steelFactor, roofing: constants.roofingFactor, wastage: constants.wastagePercent };
}

/**
 * Calibration: the multipliers the rule-based engine applies during
 * quantity take-off, editable per project (see FR-9). Loads the active
 * project's effective constants (its own override, or the admin-managed
 * global default) from GET /api/projects/:id/constants; Save changes
 * PUTs a project-level override, Cancel just re-fetches instead of
 * resetting to a local baseline.
 */
function SettingsPage() {
  const { activeProject } = useProjects();
  const { addNotification } = useNotifications();
  const [savedFactors, setSavedFactors] = useState(null);
  const [draftFactors, setDraftFactors] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = () => {
    if (!activeProject || typeof activeProject.id !== 'number') return;
    apiRequest(`/projects/${activeProject.id}/constants`).then(({ constants }) => {
      const uiFactors = toUiShape(constants);
      setSavedFactors(uiFactors);
      setDraftFactors(uiFactors);
      loadCalibrationFactors(constants);
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [activeProject?.id]);

  if (!activeProject) {
    return <NoActiveProjectState />;
  }

  if (!draftFactors) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 240 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const updateFactor = (key, value) => setDraftFactors((prev) => ({ ...prev, [key]: value }));
  const handleResetDefaults = () => setDraftFactors({ ...SYSTEM_DEFAULT_FACTORS });
  const handleCancel = () => setDraftFactors(savedFactors);
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { constants } = await apiRequest(`/projects/${activeProject.id}/constants`, {
        method: 'PUT',
        body: toApiShape(draftFactors),
      });
      const uiFactors = toUiShape(constants);
      setSavedFactors(uiFactors);
      setDraftFactors(uiFactors);
      loadCalibrationFactors(constants);
      addNotification({
        type: 'calibration_updated',
        title: 'Calibration updated',
        description: 'Calibration factors were updated and applied to new estimates.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Stack spacing={2.5} sx={{ width: '100%', flex: 1, minHeight: 0 }}>
      <CalibrationFactorsCard factors={draftFactors} onFactorChange={updateFactor} onResetDefaults={handleResetDefaults} />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
        <Button
          onClick={handleCancel}
          disabled={isSaving}
          sx={{
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
          onClick={handleSave}
          disabled={isSaving}
          variant="contained"
          disableElevation
          sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
        >
          Save changes
        </Button>
      </Stack>
    </Stack>
  );
}

export default SettingsPage;

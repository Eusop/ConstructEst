import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import CalibrationFactorsCard from '../../features/settings/components/CalibrationFactorsCard';
import { SYSTEM_DEFAULT_FACTORS } from '../../features/settings/data/calibrationDefaults';
import { useAdminActivity } from '../context/AdminActivityContext';
import { useAdminToast } from '../context/AdminToastContext';
import { getGlobalConstants, updateGlobalConstants } from '../services/adminService';
import { colors } from '../../theme/palette';

function toApiShape(factors) {
  return { cementFactor: factors.cement, steelFactor: factors.steel, roofingFactor: factors.roofing, wastagePercent: factors.wastage };
}

function toUiShape(constants) {
  return { cement: constants.cementFactor, steel: constants.steelFactor, roofing: constants.roofingFactor, wastage: constants.wastagePercent };
}

/**
 * Global Estimation Settings: the system-wide default calibration constants
 * (see backend's estimation_constants table, project_id IS NULL row) that
 * every new project falls back to until it sets its own override on the
 * User Module's Settings page. Real, persisted data via
 * /api/admin/estimation-constants — the backend already had this endpoint
 * built.
 */
function AdminSettingsPage() {
  const { logActivity } = useAdminActivity();
  const { showToast } = useAdminToast();
  const [savedFactors, setSavedFactors] = useState(null);
  const [draftFactors, setDraftFactors] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = () => {
    getGlobalConstants().then(({ constants }) => {
      const uiFactors = toUiShape(constants);
      setSavedFactors(uiFactors);
      setDraftFactors(uiFactors);
    });
  };

  useEffect(load, []);

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
      const { constants } = await updateGlobalConstants(toApiShape(draftFactors));
      const uiFactors = toUiShape(constants);
      setSavedFactors(uiFactors);
      setDraftFactors(uiFactors);
      logActivity({ message: 'Estimation constants updated', icon: TuneRoundedIcon, iconBg: colors.iconPurpleBg, iconFg: colors.iconPurpleFg });
      showToast('Estimation constants saved');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Stack spacing={2.5} sx={{ width: '100%', flex: 1, minHeight: 0 }}>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: 'text.primary' }}>Estimation Settings</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          Default calibration constants applied to every new project unless it sets its own override.
        </Typography>
      </Box>

      <CalibrationFactorsCard factors={draftFactors} onFactorChange={updateFactor} onResetDefaults={handleResetDefaults} />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
        <Button
          onClick={handleCancel}
          disabled={isSaving}
          sx={{ bgcolor: 'common.white', color: 'text.primary', border: '1px solid', borderColor: 'grey.300', '&:hover': { bgcolor: 'grey.50', borderColor: 'grey.300' } }}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving} variant="contained" disableElevation sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}>
          Save changes
        </Button>
      </Stack>
    </Stack>
  );
}

export default AdminSettingsPage;

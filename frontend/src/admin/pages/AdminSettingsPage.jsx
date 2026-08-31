import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import CalibrationFactorsCard from '../../features/settings/components/CalibrationFactorsCard';
import DesignParametersCard from '../../features/estimation/components/DesignParametersCard';
import MobileTabSwitcher from '../../components/MobileTabSwitcher';
import { SYSTEM_DEFAULT_FACTORS } from '../../features/settings/data/calibrationDefaults';
import { useAdminActivity } from '../context/AdminActivityContext';
import { useAdminToast } from '../context/AdminToastContext';
import { getGlobalConstants, updateGlobalConstants, getGlobalDesignOverrides, updateGlobalDesignOverrides } from '../services/adminService';
import { colors } from '../../theme/palette';

const EMPTY_OVERRIDES = {
  columnWidth: null, columnDepth: null, columnHeight: null, columnCount: null,
  beamWidth: null, beamDepth: null, beamLength: null,
  footingWidth: null, footingLength: null, footingDepth: null,
  floorToFloorHeight: null, stairWidth: null, buildingHeight: null,
};

function toApiShape(factors) {
  return { cementFactor: factors.cement, steelFactor: factors.steel, roofingFactor: factors.roofing, wastagePercent: factors.wastage };
}

function toUiShape(constants) {
  return { cement: constants.cementFactor, steel: constants.steelFactor, roofing: constants.roofingFactor, wastage: constants.wastagePercent };
}

/**
 * Global Estimation Settings: the system-wide defaults every new project
 * falls back to until it sets its own override —  calibration constants
 * (see estimation_constants, project_id IS NULL row) on the User Module's
 * Material Estimation page, and now also structural design parameters (see
 * project_design_overrides, same NULL-row pattern) via the same page's
 * Design Parameters card. Both resolve per-field: a project's own value
 * wins, else this global default, else the engine's own hardcoded default
 * (see backend's designOverrides.service.js getEffectiveDesignOverrides).
 */
function AdminSettingsPage() {
  const { logActivity } = useAdminActivity();
  const { showToast } = useAdminToast();
  const [savedFactors, setSavedFactors] = useState(null);
  const [draftFactors, setDraftFactors] = useState(null);
  const [savedOverrides, setSavedOverrides] = useState(null);
  const [draftOverrides, setDraftOverrides] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = () => {
    Promise.all([getGlobalConstants(), getGlobalDesignOverrides()]).then(([{ constants }, { overrides }]) => {
      const uiFactors = toUiShape(constants);
      setSavedFactors(uiFactors);
      setDraftFactors(uiFactors);
      setSavedOverrides(overrides);
      setDraftOverrides(overrides);
    });
  };

  useEffect(load, []);

  if (!draftFactors || !draftOverrides) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 240 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const updateFactor = (key, value) => setDraftFactors((prev) => ({ ...prev, [key]: value }));
  const handleResetFactors = () => setDraftFactors({ ...SYSTEM_DEFAULT_FACTORS });
  const updateOverride = (key, value) => setDraftOverrides((prev) => ({ ...prev, [key]: value }));
  const handleResetOverrides = () => setDraftOverrides({ ...EMPTY_OVERRIDES });

  const handleCancel = () => {
    setDraftFactors(savedFactors);
    setDraftOverrides(savedOverrides);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const [{ constants }, { overrides }] = await Promise.all([
        updateGlobalConstants(toApiShape(draftFactors)),
        updateGlobalDesignOverrides(draftOverrides),
      ]);
      const uiFactors = toUiShape(constants);
      setSavedFactors(uiFactors);
      setDraftFactors(uiFactors);
      setSavedOverrides(overrides);
      setDraftOverrides(overrides);
      logActivity({ message: 'Estimation defaults updated', icon: TuneRoundedIcon, iconBg: colors.iconPurpleBg, iconFg: colors.iconPurpleFg });
      showToast('Estimation defaults saved');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Stack spacing={2.5} sx={{ width: '100%', flex: 1, minHeight: 0 }}>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.4rem' }, color: 'text.primary' }}>Estimation Settings</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
          Default calibration factors and design parameters applied to every new project unless it sets its own override.
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ alignItems: 'stretch' }}>
        <MobileTabSwitcher labels={['Design', 'Calibration']}>
          <DesignParametersCard overrides={draftOverrides} onOverrideChange={updateOverride} onResetAll={handleResetOverrides} />
          <CalibrationFactorsCard factors={draftFactors} onFactorChange={updateFactor} onResetDefaults={handleResetFactors} />
        </MobileTabSwitcher>
      </Stack>

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

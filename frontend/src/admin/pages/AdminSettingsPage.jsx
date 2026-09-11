import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
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
  // Cancel/Save were removed from the UI on request, but the save/cancel
  // logic below is left wired up as-is (not a functionality change) in case
  // a trigger for it returns — hence the lint suppressions on this and the
  // two handlers below, which would otherwise flag them as unused.
  // eslint-disable-next-line no-unused-vars
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

  // eslint-disable-next-line no-unused-vars
  const handleCancel = () => {
    setDraftFactors(savedFactors);
    setDraftOverrides(savedOverrides);
  };

  // eslint-disable-next-line no-unused-vars
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
    <Box sx={{ width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.4rem' }, color: 'text.primary' }}>Estimation Configuration</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
            Default calibration factors and design parameters applied to every new project unless it sets its own override.
          </Typography>
        </Box>

        {/* alignItems: 'flex-start' at lg+ (row layout) so the two cards sit at
            their own natural content height side by side, instead of the
            shorter one being cross-stretched to match the taller one and
            ending in a block of dead white space (visible once the Cancel/
            Save row — which used to visually anchor the bottom of both — was
            removed). 'stretch' below lg (column layout) is unchanged: that's
            what makes each stacked card span the full container width. */}
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ alignItems: { xs: 'stretch', lg: 'flex-start' } }}>
          <MobileTabSwitcher labels={['Design', 'Calibration']}>
            <DesignParametersCard overrides={draftOverrides} onOverrideChange={updateOverride} onResetAll={handleResetOverrides} />
            <CalibrationFactorsCard factors={draftFactors} onFactorChange={updateFactor} onResetDefaults={handleResetFactors} />
          </MobileTabSwitcher>
        </Stack>
      </Stack>

      {/* Explicit-height spacer, not padding on the flex:1/minHeight:0
          container above — this page has no inner flex/minHeight:0/
          overflow:auto panel of its own the way AdminMaterialsPage/
          AdminStoresPage do (their content scrolls inside that inner panel
          instead, so AdminLayout's content Box itself never has to scroll).
          Here the cards are left to grow to their natural, possibly tall,
          height, so that outer Box does end up scrolling — and browsers
          drop a nested flex-basis:0 item's own end-padding/margin from the
          scrollable area once it overflows, which silently ate a plain
          `pb` here too. A sibling with a real height isn't subject to
          that, so it reliably reproduces AdminLayout's own bottom spacing
          on this page's content regardless of which of the two cards ends
          up longest. */}
      <Box sx={{ flexShrink: 0, height: { xs: 16, md: 24 } }} />
    </Box>
  );
}

export default AdminSettingsPage;

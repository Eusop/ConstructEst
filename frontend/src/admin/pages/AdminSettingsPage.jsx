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
  scaffoldingSetWidth: null, scaffoldingSetHeight: null, scaffoldingSetCount: null,
  riserHeight: null, treadDepth: null, waistThickness: null, stairRebarSpacing: null,
  columnWidthSecond: null, columnDepthSecond: null,
  beamRebarLength: null, beamRebarDiameterMm: null,
  footingCount: null, footingRebarKgPerM3: null, footingThickness: null,
  groundSlabBarMm: null, groundSlabBarSpacing: null, secondSlabBarMm: null, secondSlabBarSpacing: null,
  columnBarCount: null, columnBarMm: null, columnTieSpacing: null, beamStirrupSpacing: null, beamStirrupMm: null,
  formworkUses: null, scaffoldingUses: null,
  columnRebarKgPerM3: null, beamRebarKgPerM3: null, trussFramingKgPerM2: null, angleBarKgPerM: null,
};

function toApiShape(factors) {
  return { cementFactor: factors.cement, steelFactor: factors.steel, roofingFactor: factors.roofing, wastagePercent: factors.wastage };
}

function toUiShape(constants) {
  return { cement: constants.cementFactor, steel: constants.steelFactor, roofing: constants.roofingFactor, wastage: constants.wastagePercent };
}

/**
 * Global Estimation Settings: the system-wide defaults every new project uses
 * until it sets its own override. That covers the calibration constants
 * (estimation_constants, project_id IS NULL row) and the structural design
 * parameters (project_design_overrides, same NULL-row pattern), both edited
 * through the Material Estimation page's cards. Each field resolves on its own:
 * the project's value, else this global default, else the engine's default (see
 * getEffectiveDesignOverrides in designOverrides.service.js).
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

  // Save/Cancel only appear when a draft differs from what's saved. Both cards
  // save together in one request, so either being dirty shows it. The state is
  // plain primitives, so a JSON comparison is a simple, reliable dirty check.
  const isDirty = JSON.stringify(draftFactors) !== JSON.stringify(savedFactors)
    || JSON.stringify(draftOverrides) !== JSON.stringify(savedOverrides);

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
    <Box sx={{ width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.4rem' }, color: 'text.primary' }}>Estimation Configuration</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
            Default calibration factors and design parameters applied to every new project unless it sets its own override.
          </Typography>
        </Box>

        {/* alignItems: 'flex-start' at lg+ (row) so the two cards keep their own
            height instead of the shorter one stretching into dead white space.
            'stretch' below lg (column) lets each stacked card span the full width. */}
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ alignItems: { xs: 'stretch', lg: 'flex-start' } }}>
          <MobileTabSwitcher labels={['Design', 'Calibration']}>
            <DesignParametersCard overrides={draftOverrides} onOverrideChange={updateOverride} onResetAll={handleResetOverrides} />
            <CalibrationFactorsCard factors={draftFactors} onFactorChange={updateFactor} onResetDefaults={handleResetFactors} />
          </MobileTabSwitcher>
        </Stack>

        {/* Only shown when a draft differs from what's saved, so the page has no
            buttons otherwise but dragging a slider can still be saved. */}
        {isDirty && (
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
              variant="contained"
              disableElevation
              disabled={isSaving}
              startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark } }}
            >
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </Stack>
        )}
      </Stack>

      {/* Explicit-height spacer instead of padding on the flex:1/minHeight:0
          container above. This page has no inner scroll panel (unlike
          AdminMaterialsPage/AdminStoresPage), so the outer Box scrolls, and
          browsers drop a nested flex-basis:0 item's end padding from the
          scrollable area once it overflows, which ate a plain `pb`. A sibling with
          a real height isn't affected, so it restores AdminLayout's bottom spacing. */}
      <Box sx={{ flexShrink: 0, height: { xs: 16, md: 24 } }} />
    </Box>
  );
}

export default AdminSettingsPage;

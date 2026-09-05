import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Tooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import QuantityTakeoffTable from '../features/estimation/components/QuantityTakeoffTable';
import DesignParametersCard from '../features/estimation/components/DesignParametersCard';
import CalibrationFactorsCard from '../features/settings/components/CalibrationFactorsCard';
import NoActiveProjectState from '../features/projects/components/NoActiveProjectState';
import MobileTabSwitcher from '../components/MobileTabSwitcher';
import { useProjects } from '../context/ProjectsContext';
import { useNotifications } from '../context/NotificationsContext';
import { apiRequest } from '../services/apiClient';
import { PARSED_MEASUREMENTS, loadParsedProject } from '../features/projects/data/parsedProjectMock';
import { loadQuantityTakeoff } from '../features/estimation/data/quantityTakeoffMaterials';
import { SYSTEM_DEFAULT_FACTORS } from '../features/settings/data/calibrationDefaults';
import { ROUTES } from '../routes/paths';
import { colors } from '../theme/palette';

const EMPTY_OVERRIDES = {
  columnWidth: null, columnDepth: null, columnHeight: null, columnCount: null,
  beamWidth: null, beamDepth: null, beamLength: null,
  footingWidth: null, footingLength: null, footingDepth: null,
  floorToFloorHeight: null, stairWidth: null, buildingHeight: null,
};

function toApiFactors(factors) {
  return { cementFactor: factors.cement, steelFactor: factors.steel, roofingFactor: factors.roofing, wastagePercent: factors.wastage };
}

function toUiFactors(constants) {
  return { cement: constants.cementFactor, steel: constants.steelFactor, roofing: constants.roofingFactor, wastage: constants.wastagePercent };
}

/**
 * Material Estimation: the itemized quantity take-off, plus the calibration
 * factors and structural design-parameter overrides that feed it — merged
 * onto one page (rather than calibration living on its own Settings page)
 * so tweaking an input and recomputing is a single, local loop instead of a
 * round trip through a different part of the app.
 *
 * Loads the active project's estimation, effective constants (its own
 * override, or the admin-managed global default), and design overrides;
 * "Recalculate" persists both drafts (PUT constants, PUT design-overrides)
 * then re-runs the engine (POST recompute) against the same uploaded DXF,
 * replacing the on-screen take-off with the new run without a re-upload.
 */
function MaterialEstimationPage() {
  const { activeProject, updateActiveProject, refreshActiveProjectEstimation } = useProjects();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [savedFactors, setSavedFactors] = useState(null);
  const [draftFactors, setDraftFactors] = useState(null);
  const [savedOverrides, setSavedOverrides] = useState(null);
  const [draftOverrides, setDraftOverrides] = useState(null);
  const [savedIncludeRoofing, setSavedIncludeRoofing] = useState(null);
  const [draftIncludeRoofing, setDraftIncludeRoofing] = useState(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  useEffect(() => {
    if (!activeProject || typeof activeProject.id !== 'number') return undefined;
    let cancelled = false;

    (async () => {
      const estimation = activeProject.estimation ?? (await refreshActiveProjectEstimation());
      if (cancelled || !estimation) return;

      loadParsedProject(estimation);
      loadQuantityTakeoff(estimation.materials);
      setSavedIncludeRoofing(activeProject.includeRoofing);
      setDraftIncludeRoofing(activeProject.includeRoofing);

      try {
        const [{ constants }, { overrides }] = await Promise.all([
          apiRequest(`/projects/${activeProject.id}/constants`),
          apiRequest(`/projects/${activeProject.id}/design-overrides`),
        ]);
        if (cancelled) return;
        const uiFactors = toUiFactors(constants);
        setSavedFactors(uiFactors);
        setDraftFactors(uiFactors);
        setSavedOverrides(overrides);
        setDraftOverrides(overrides);
      } catch {
        if (!cancelled) {
          setSavedFactors(SYSTEM_DEFAULT_FACTORS);
          setDraftFactors(SYSTEM_DEFAULT_FACTORS);
          setSavedOverrides(EMPTY_OVERRIDES);
          setDraftOverrides(EMPTY_OVERRIDES);
        }
      }

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProject?.id, activeProject?.estimation, activeProject?.includeRoofing, refreshActiveProjectEstimation]);

  if (!activeProject) {
    return <NoActiveProjectState />;
  }

  if (!ready || !draftFactors || !draftOverrides) {
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

  const hasChanges =
    JSON.stringify(draftFactors) !== JSON.stringify(savedFactors) ||
    JSON.stringify(draftOverrides) !== JSON.stringify(savedOverrides) ||
    draftIncludeRoofing !== savedIncludeRoofing;

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const [{ constants }, { overrides }] = await Promise.all([
        apiRequest(`/projects/${activeProject.id}/constants`, { method: 'PUT', body: toApiFactors(draftFactors) }),
        apiRequest(`/projects/${activeProject.id}/design-overrides`, { method: 'PUT', body: draftOverrides }),
      ]);
      const uiFactors = toUiFactors(constants);
      setSavedFactors(uiFactors);
      setDraftFactors(uiFactors);
      setSavedOverrides(overrides);
      setDraftOverrides(overrides);

      const { project, estimation } = await apiRequest(`/projects/${activeProject.id}/recompute`, {
        method: 'POST',
        body: { includeRoofing: draftIncludeRoofing },
      });
      updateActiveProject({ estimation, includeRoofing: project.includeRoofing });
      setSavedIncludeRoofing(project.includeRoofing);
      setDraftIncludeRoofing(project.includeRoofing);
      loadParsedProject(estimation);
      loadQuantityTakeoff(estimation.materials);

      addNotification({
        type: 'calibration_updated',
        title: 'Estimate recalculated',
        description: `${activeProject.projectName}'s quantity take-off was recomputed with the updated factors and design parameters.`,
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    // Mobile: no longer forced to stretch and fill the viewport (`flex:1`)
    // — with the quantity take-off's material groups now closed by default,
    // that forced stretch left a large empty gap below the short collapsed
    // content instead of the page simply ending at its natural height.
    // sm+ keeps the original flex:1 behavior unchanged.
    <Stack spacing={2.5} sx={{ flex: { xs: 'unset', sm: 1 }, minHeight: { xs: 'auto', sm: 0 }, minWidth: 0 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.4rem' }, color: 'text.primary' }}>Quantity take-off</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
            From {PARSED_MEASUREMENTS.floorArea} floor area · {PARSED_MEASUREMENTS.totalWallLength} walls ·{' '}
            {PARSED_MEASUREMENTS.roofArea} roof
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
          <Tooltip title="Turn off if this floor plan doesn't have a ROOF layer drawn — some real files intentionally leave the roof out. Excludes roofing sheets, purlins, ridge, flashing, angle bar, and gutter from the take-off, cost, and BOM.">
            <FormControlLabel
              sx={{ mr: 0 }}
              control={
                <Switch
                  size="small"
                  checked={Boolean(draftIncludeRoofing)}
                  onChange={(e) => setDraftIncludeRoofing(e.target.checked)}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: colors.accentBlue }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: colors.accentBlue } }}
                />
              }
              label={
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: 'text.primary' }}>Include roofing</Typography>
                  <InfoOutlinedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                </Stack>
              }
            />
          </Tooltip>

          <Button
            onClick={handleRecalculate}
            variant={hasChanges || isRecalculating ? 'contained' : 'outlined'}
            disableElevation
            disabled={!hasChanges || isRecalculating}
            startIcon={isRecalculating ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : <RefreshRoundedIcon />}
            sx={
              hasChanges || isRecalculating
                ? {
                    bgcolor: colors.accentBlue,
                    color: 'common.white',
                    '&:hover': { bgcolor: colors.accentBlueDark },
                    '&.Mui-disabled': { bgcolor: colors.accentBlue, color: 'common.white' },
                    flexShrink: 0,
                  }
                : {
                    bgcolor: 'transparent',
                    color: colors.accentBlue,
                    borderColor: colors.accentBlue,
                    '&.Mui-disabled': { color: colors.accentBlue, borderColor: colors.accentBlue, opacity: 0.5 },
                    flexShrink: 0,
                  }
            }
          >
            Recalculate
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ alignItems: 'stretch' }}>
        <MobileTabSwitcher labels={['Design', 'Calibration']}>
          <DesignParametersCard
            overrides={draftOverrides}
            onOverrideChange={updateOverride}
            onResetAll={handleResetOverrides}
            storeys={activeProject.storeys}
          />
          <CalibrationFactorsCard factors={draftFactors} onFactorChange={updateFactor} onResetDefaults={handleResetFactors} />
        </MobileTabSwitcher>
      </Stack>

      <QuantityTakeoffTable
        storeys={activeProject.storeys}
        factors={savedFactors}
        onContinue={() => navigate(ROUTES.STORE_LOCATOR)}
      />
    </Stack>
  );
}

export default MaterialEstimationPage;

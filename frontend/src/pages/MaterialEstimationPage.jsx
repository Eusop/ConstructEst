import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import QuantityTakeoffTable from '../features/estimation/components/QuantityTakeoffTable';
import NoActiveProjectState from '../features/projects/components/NoActiveProjectState';
import { useProjects } from '../context/ProjectsContext';
import { apiRequest } from '../services/apiClient';
import { PARSED_MEASUREMENTS, loadParsedProject } from '../features/projects/data/parsedProjectMock';
import { loadQuantityTakeoff } from '../features/estimation/data/quantityTakeoffMaterials';
import { loadCalibrationFactors } from '../features/settings/data/calibrationDefaults';
import { ROUTES } from '../routes/paths';

/**
 * Material Estimation: the itemized quantity take-off computed from the
 * parsed floor plan, reachable from the Projects results page ("View
 * estimate") or directly via the sidebar. Reads the active project from
 * ProjectsContext; if its estimation isn't already in memory (e.g. after a
 * reload), fetches it once and feeds the result into the same data modules
 * QuantityTakeoffTable/FactorsAppliedBanner already read.
 */
function MaterialEstimationPage() {
  const { activeProject, refreshActiveProjectEstimation } = useProjects();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!activeProject || typeof activeProject.id !== 'number') return undefined;
    let cancelled = false;

    (async () => {
      const estimation = activeProject.estimation ?? (await refreshActiveProjectEstimation());
      if (cancelled || !estimation) return;

      loadParsedProject(estimation);
      loadQuantityTakeoff(estimation.materials);

      try {
        const { constants } = await apiRequest(`/projects/${activeProject.id}/constants`);
        if (!cancelled) loadCalibrationFactors(constants);
      } catch {
        // Non-critical — the banner just shows whatever was last loaded.
      }

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProject?.id, activeProject?.estimation, refreshActiveProjectEstimation]);

  if (!activeProject) {
    return <NoActiveProjectState />;
  }

  if (!ready) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 240 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0, minWidth: 0 }}>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: 'text.primary' }}>Quantity take-off</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          From {PARSED_MEASUREMENTS.floorArea} floor area · {PARSED_MEASUREMENTS.totalWallLength} walls ·{' '}
          {PARSED_MEASUREMENTS.roofArea} roof
        </Typography>
      </Box>

      <QuantityTakeoffTable storeys={activeProject.storeys} onContinue={() => navigate(ROUTES.STORE_LOCATOR)} />
    </Stack>
  );
}

export default MaterialEstimationPage;

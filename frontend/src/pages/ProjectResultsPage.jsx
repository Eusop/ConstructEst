import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import FloorPlanPreviewCard from '../features/projects/components/FloorPlanPreviewCard';
import ExtractedMeasurementsCard from '../features/projects/components/ExtractedMeasurementsCard';
import EstimatedCostBanner from '../features/projects/components/EstimatedCostBanner';
import NoActiveProjectState from '../features/projects/components/NoActiveProjectState';
import { useProjects } from '../context/ProjectsContext';
import { ESTIMATED_COST, ESTIMATED_COST_VALUE, loadParsedProject } from '../features/projects/data/parsedProjectMock';
import { ROUTES } from '../routes/paths';

function formatCeilingLabel(value) {
  const numeric = Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return `₱${value}`;
  return `₱${numeric.toLocaleString('en-PH')}`;
}

/**
 * Shown once parsing finishes: a snapshot of the active project's parsed
 * floor plan and extracted measurements. Reads the active project from
 * ProjectsContext; if its estimation isn't already in memory (e.g. after a
 * reload), fetches it once and feeds it into parsedProjectMock, same as
 * MaterialEstimationPage.
 */
function ProjectResultsPage() {
  const { activeProject, refreshActiveProjectEstimation } = useProjects();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!activeProject || typeof activeProject.id !== 'number') return undefined;
    let cancelled = false;

    (async () => {
      const estimation = activeProject.estimation ?? (await refreshActiveProjectEstimation());
      if (cancelled) return;
      if (estimation) loadParsedProject(estimation);
      setReady(true);
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

  const ceilingValue = Number(String(activeProject.budgetCeiling).replace(/,/g, ''));
  const withinBudget = !Number.isFinite(ceilingValue) || ceilingValue === 0 || ESTIMATED_COST_VALUE <= ceilingValue;
  const fileValidation = activeProject.fileValidation ?? {};
  const secondFloorFileValidation = activeProject.secondFloorFileValidation ?? {};

  return (
    // Mobile: not forced to stretch and fill the viewport — the Paper
    // below is `flex: 1`, so that stretch inflated it into a tall white card
    // with a large empty gap under short content. Matches the root pattern
    // already used by MaterialEstimationPage / BrandSelectionPage /
    // BillOfMaterialsPage. sm+ keeps the original flex:1 behavior.
    <Stack spacing={2.5} sx={{ flex: { xs: 'unset', sm: 1 }, minHeight: { xs: 'auto', sm: 0 } }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: 'common.white',
          boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
          p: { xs: 2.5, md: 4 },
          // sm+ (tablet and desktop): natural, content-based sizing
          // instead of flex:1/minHeight:0. Mobile (xs) still uses that
          // combination unchanged, since it never hit this bug — but once
          // this card's real content (floor plan + extracted measurements
          // + detailed extraction info + cost banner) is taller than the
          // viewport at sm+, forcing the DashboardLayout content area to
          // scroll, a flex-basis:0/min-height:0 item's own background
          // stops covering its actual rendered height once it overflows
          // its flex-computed size — the overflowing content (in
          // practice, everything from partway through "Extracted
          // measurements" onward) still renders, just without this
          // card's white background behind it, exposing the page
          // background instead. minHeight:'auto' restores the browser's
          // normal "never shrink below content" protection for a flex
          // item, which keeps the white background covering the card's
          // true full height regardless of viewport/scroll state.
          flex: { xs: 1, sm: 'initial' },
          minHeight: { xs: 0, sm: 'auto' },
        }}
      >
        <Stack spacing={3} divider={<Divider />}>
          <FloorPlanPreviewCard
            projectName={activeProject.projectName}
            shapes={fileValidation.shapes}
            bounds={fileValidation.bounds}
            hasSecondFloorFile={activeProject.hasSecondFloorFile}
            secondFloorShapes={secondFloorFileValidation.shapes}
            secondFloorBounds={secondFloorFileValidation.bounds}
          />
          <ExtractedMeasurementsCard storeys={activeProject.storeys} />
          <EstimatedCostBanner
            estimatedCost={ESTIMATED_COST}
            ceilingLabel={formatCeilingLabel(activeProject.budgetCeiling)}
            withinBudget={withinBudget}
            onViewEstimate={() => navigate(ROUTES.MATERIAL_ESTIMATION)}
          />
        </Stack>
      </Paper>
    </Stack>
  );
}

export default ProjectResultsPage;

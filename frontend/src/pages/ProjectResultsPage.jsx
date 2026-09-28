import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import FloorPlanPreviewCard from '../features/projects/components/FloorPlanPreviewCard';
import ExtractedMeasurementsCard from '../features/projects/components/ExtractedMeasurementsCard';
import NoActiveProjectState from '../features/projects/components/NoActiveProjectState';
import { useProjects } from '../context/ProjectsContext';
import { loadParsedProject } from '../features/projects/data/parsedProjectCache';
import { ROUTES } from '../routes/paths';
import { colors } from '../theme/palette';

/**
 * Shown when parsing finishes: a snapshot of the parsed floor plan and
 * extracted measurements. Reads the active project from ProjectsContext; if its
 * estimation isn't in memory (e.g. after a reload), it fetches it once and feeds
 * parsedProjectCache, same as MaterialEstimationPage.
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

  const fileValidation = activeProject.fileValidation ?? {};
  const secondFloorFileValidation = activeProject.secondFloorFileValidation ?? {};

  return (
    // Unlike the shared root pattern (MaterialEstimationPage, BrandSelectionPage,
    // BillOfMaterialsPage), this Stack does not use `flex: 1` at `sm`+. Those
    // pages have a Paper that is `flex: 1` and scrolls inside a bounded height.
    // This page's Paper is natural height, so `flex: 1` here only made content
    // overflow the stretched box and swallowed DashboardLayout's bottom padding.
    // Natural flow lets that padding show like on every other page.
    <Stack spacing={2.5} sx={{ flex: 'unset', minHeight: 'auto' }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: 'common.white',
          boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
          p: { xs: 2.5, md: 4 },
          // sm+ (tablet and desktop): natural, content-based sizing instead of
          // flex:1/minHeight:0. Mobile (xs) keeps that and never hit this bug. When the
          // card's content is taller than the viewport, a flex-basis:0/min-height:0
          // item's background stops covering the overflow, exposing the page
          // background. minHeight:'auto' keeps the white background over the full
          // card. (Separate from the outer Stack fix above, which is about the
          // page's bottom spacing.)
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
          <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', sm: 'flex-end' } }}>
            <Button
              onClick={() => navigate(ROUTES.MATERIAL_ESTIMATION)}
              variant="contained"
              disableElevation
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{
                bgcolor: colors.accentBlue,
                '&:hover': { bgcolor: colors.accentBlueDark },
                flexShrink: 0,
                // Full-bleed primary CTA on phones, like the other mobile
                // "Continue"/"Download" actions.
                width: { xs: '100%', sm: 'auto' },
                minHeight: { xs: 46, sm: 'auto' },
              }}
            >
              View estimate
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}

export default ProjectResultsPage;

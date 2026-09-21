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
 * Shown once parsing finishes: a snapshot of the active project's parsed
 * floor plan and extracted measurements. Reads the active project from
 * ProjectsContext; if its estimation isn't already in memory (e.g. after a
 * reload), fetches it once and feeds it into parsedProjectCache, same as
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

  const fileValidation = activeProject.fileValidation ?? {};
  const secondFloorFileValidation = activeProject.secondFloorFileValidation ?? {};

  return (
    // This Stack no longer switches to `flex: 1` at `sm`+ the way the
    // shared root pattern (MaterialEstimationPage / BrandSelectionPage /
    // BillOfMaterialsPage) does — those pages need it because *their* Paper
    // is itself `flex: 1` + `overflow: auto`, scrolling internally within a
    // bounded height. This page's Paper is natural-height instead (see its
    // own comment below), so it never consumed that bounded height in the
    // first place; keeping the outer Stack as `flex: 1` here only meant it
    // stretched to fill the viewport while its content (via this Stack)
    // rendered past that stretched box once taller than the viewport —
    // and a flex item's own trailing padding/margin gets absorbed into its
    // flex-computed size rather than extending past it in that situation,
    // which is why DashboardLayout's own bottom padding (and two different
    // attempts to add more of it here) never actually showed up below the
    // card. Plain natural-height flow (same as this page already correctly
    // uses on phones) doesn't have that problem: the page's true height
    // (including this Paper's own margin/padding) is exactly what
    // DashboardLayout's scrolling content box sees, so its existing
    // `p: { xs: 2, md: 3 }` bottom padding shows up the same way it does
    // on every other page, with no extra spacing hack needed here.
    <Stack spacing={2.5} sx={{ flex: 'unset', minHeight: 'auto' }}>
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
          // + detailed extraction info + the "View estimate" action) is
          // taller than the viewport at sm+, forcing the DashboardLayout
          // content area to scroll, a flex-basis:0/min-height:0 item's own
          // background stops covering its actual rendered height once it
          // overflows its flex-computed size — the overflowing content (in
          // practice, everything from partway through "Extracted
          // measurements" onward) still renders, just without this
          // card's white background behind it, exposing the page
          // background instead. minHeight:'auto' restores the browser's
          // normal "never shrink below content" protection for a flex
          // item, which keeps the white background covering the card's
          // true full height regardless of viewport/scroll state. (This
          // is a separate, older fix from the outer Stack's own comment
          // above — that one is about the *page's* bottom spacing, this
          // one is about the *card's* own background coverage.)
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
                // Full-bleed primary CTA on phones, same convention as this
                // app's other mobile "Continue"/"Download" actions (Store
                // Locator, Brand Selection, Bill of Materials).
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

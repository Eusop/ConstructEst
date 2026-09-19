import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import SquareFootRoundedIcon from '@mui/icons-material/SquareFootRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import InsertChartRoundedIcon from '@mui/icons-material/InsertChartRounded';
import SportsScoreRoundedIcon from '@mui/icons-material/SportsScoreRounded';
import ParsingProgressRing from '../features/projects/components/ParsingProgressRing';
import ParsingChecklist from '../features/projects/components/ParsingChecklist';
import ProjectSummaryCard from '../features/projects/components/ProjectSummaryCard';
import { useSimulatedParsing } from '../features/projects/hooks/useSimulatedParsing';
import { useProjects } from '../context/ProjectsContext';
import { useDashboardActivity } from '../context/DashboardActivityContext';
import { useToast } from '../context/ToastContext';
import { ROUTES } from '../routes/paths';
import { colors } from '../theme/palette';

// Total simulated duration and each step's share of it. Swap
// useSimulatedParsing for a real backend-polling hook later — everything
// below only depends on its { percent, activeIndex, isComplete } return
// shape, not on how progress is produced.
const DURATION_MS = 10000;

function buildSteps(draft) {
  return [
    {
      key: 'upload',
      weight: 0.8,
      icon: UploadFileRoundedIcon,
      title: 'Uploading DXF',
      subtitle: draft.file ? `${draft.file.name} · ${draft.file.sizeLabel}` : 'No file attached',
      headline: 'Uploading floor plan...',
      detail: `Sending ${draft.file?.name ?? 'your file'} to the parser.`,
    },
    {
      key: 'read',
      weight: 0.7,
      icon: DescriptionRoundedIcon,
      title: 'Reading file',
      subtitle: 'Validated CAD structure and layers',
      headline: 'Reading file...',
      detail: 'Validating CAD structure, units, and layer names.',
    },
    {
      key: 'analyze',
      weight: 4,
      icon: SquareFootRoundedIcon,
      title: 'Analyzing floor plan',
      subtitle: 'Measuring walls, floor area, and roofing',
      headline: 'Analyzing floor plan...',
      detail: (
        <>
          Detecting{' '}
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
            WALLS
          </Box>
          ,{' '}
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
            FLOOR_AREA
          </Box>
          , and{' '}
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
            ROOF
          </Box>{' '}
          layers, then measuring wall lengths and areas.
        </>
      ),
    },
    {
      key: 'calculate',
      weight: 2,
      icon: CalculateRoundedIcon,
      title: 'Calculating material quantities',
      subtitle: 'Applying rule-based formulas & factors',
      headline: 'Calculating material quantities...',
      detail: 'Applying rule-based formulas and regional wastage factors.',
    },
    {
      key: 'generate',
      weight: 1.5,
      icon: InsertChartRoundedIcon,
      title: 'Generating results',
      subtitle: 'Building the itemized take-off',
      headline: 'Generating results...',
      detail: 'Building the itemized material take-off.',
    },
    {
      key: 'complete',
      weight: 1,
      icon: SportsScoreRoundedIcon,
      title: 'Completed',
      subtitle: 'Redirects to results automatically',
      headline: 'Completed',
      detail: 'Redirecting you to the results automatically.',
    },
  ];
}

/**
 * Shown right after "Create & parse DXF" while the parsing job runs.
 * By this point `createProjectFromDraft()` has already run (see
 * NewProjectPage), so this page reads the active project, not the draft —
 * the draft was reset the moment the project was created. Automatically
 * moves on to the results page once parsing completes, marking the active
 * project 'Estimated'.
 */
function ProjectProcessingPage() {
  const { activeProject, deleteProject, activeProjectId } = useProjects();
  const { incrementEstimationsDone, logActivity } = useDashboardActivity();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const steps = buildSteps(activeProject ?? {});
  const hasFailed = activeProject?.status === 'Failed';
  const { percent, activeIndex, isComplete } = useSimulatedParsing(steps, DURATION_MS, activeProject?.status !== 'Parsing');
  const activeStep = steps[activeIndex];

  useEffect(() => {
    if (!isComplete || hasFailed) return undefined;
    const timeout = setTimeout(() => {
      incrementEstimationsDone();
      logActivity({ type: 'dxf_parsed', message: `Uploaded DXF ${activeProject?.file?.name ?? 'floor plan'}` });
      logActivity({ type: 'estimation_completed', message: `Completed material estimation for ${activeProject?.projectName}` });
      navigate(ROUTES.PROJECT_RESULTS);
    }, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete, hasFailed, navigate]);

  const handleCancel = () => {
    if (activeProjectId) {
      deleteProject(activeProjectId).catch((error) => showToast(error.message || 'Could not discard this project.'));
    }
    navigate(ROUTES.NEW_PROJECT);
  };

  return (
    <Box>
      {/* Mobile: dropped — the header above already reads "Processing" (see
          DashboardLayout's mobile title for this route), and the ring +
          headline in the card just below repeats the same "what's
          happening" info, so this was redundant height with nothing else
          to balance against. Desktop keeps it: there the header is a full
          "Projects > name > Processing" breadcrumb instead, so this is the
          only place that names the page in plain language. */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: 'text.primary' }}>
          Processing your project
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', mb: 2.5 }}>
          We&apos;re reading your floor plan and preparing the estimate. This usually takes under a minute.
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
        <Box sx={{ flex: { md: 2 }, width: '100%' }}>
          <Paper
            elevation={0}
            sx={{ borderRadius: 3, bgcolor: 'common.white', boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)', p: { xs: 2.5, md: 3.5 } }}
          >
            <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center', mb: 2.5 }}>
              <ParsingProgressRing value={percent} />
              <Box sx={{ minHeight: 64 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
                  {activeStep.headline}
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>{activeStep.detail}</Typography>
              </Box>
            </Stack>

            <LinearProgress
              variant="determinate"
              value={percent}
              sx={{
                height: 6,
                borderRadius: 999,
                mb: 3,
                bgcolor: 'grey.100',
                '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: colors.accentBlue },
              }}
            />

            <ParsingChecklist steps={steps} activeIndex={activeIndex} />
          </Paper>
        </Box>

        <Stack spacing={2.5} sx={{ flex: { md: 1 }, width: '100%' }}>
          <ProjectSummaryCard draft={activeProject ?? {}} />

          {hasFailed ? (
            <Paper
              elevation={0}
              sx={{ borderRadius: 3, bgcolor: colors.iconRedBg, p: 2, display: 'flex', gap: 1.25, alignItems: 'flex-start' }}
            >
              <InfoRoundedIcon sx={{ color: colors.iconRedFg, fontSize: 20, mt: 0.25, flexShrink: 0 }} />
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>
                  Parsing failed
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                  {activeProject?.parseError || 'The floor plan could not be parsed. Check the DXF layers and try again.'}
                </Typography>
              </Box>
            </Paper>
          ) : (
            <Paper
              elevation={0}
              sx={{ borderRadius: 3, bgcolor: colors.iconBlueBg, p: 2, display: 'flex', gap: 1.25, alignItems: 'flex-start' }}
            >
              <InfoRoundedIcon sx={{ color: colors.iconBlueFg, fontSize: 20, mt: 0.25, flexShrink: 0 }} />
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>
                  You can keep working
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                  Parsing continues in the background. We&apos;ll open the results automatically when it&apos;s done.
                </Typography>
              </Box>
            </Paper>
          )}

          <Button
            onClick={handleCancel}
            startIcon={<CloseRoundedIcon />}
            sx={{
              bgcolor: 'common.white',
              color: 'text.primary',
              border: '1px solid',
              borderColor: 'grey.300',
              '&:hover': { bgcolor: 'grey.50', borderColor: 'grey.300' },
            }}
          >
            Cancel parsing
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

export default ProjectProcessingPage;

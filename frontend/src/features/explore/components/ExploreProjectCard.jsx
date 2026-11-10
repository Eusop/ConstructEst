import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import SharedFloorPlan from './SharedFloorPlan';
import { formatMeasurement, formatPeso, formatQuantity } from '../../../utils/formatNumbers';
import { colors } from '../../../theme/palette';

const pill = (bg, fg) => ({ bgcolor: bg, color: fg, borderRadius: 999, px: 1, py: 0.2 });

/**
 * One shared project in the Explore feed: its name and size (never the owner
 * or location), its cost at today's prices and key quantities. Click opens details.
 *
 * @param {object} props
 * @param {object} props.project Item from GET /api/explore.
 * @param {() => void} props.onOpen
 */
function ExploreProjectCard({ project, onOpen }) {
  return (
    <Paper
      elevation={0}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpen(); }}
      sx={{
        borderRadius: 3, bgcolor: 'common.white', border: '1px solid', borderColor: 'divider', p: { xs: 1.75, sm: 2 },
        cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 1,
        transition: 'box-shadow 0.15s ease', '&:hover': { boxShadow: '0 4px 16px rgba(20, 30, 60, 0.1)' },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.98rem', color: 'text.primary', overflowWrap: 'anywhere' }}>{project.projectName}</Typography>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{project.label}</Typography>
        </Box>
        {project.matchPercent != null && (
          <Box sx={pill(colors.iconGreenBg, colors.iconGreenFg)}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 800 }}>{project.matchPercent}% match</Typography>
          </Box>
        )}
        {project.isYours && (
          <Box sx={pill(colors.iconBlueBg, colors.accentBlue)}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>Your project</Typography>
          </Box>
        )}
      </Stack>

      {project.hasFloorPlan && <SharedFloorPlan projectId={project.id} height={140} />}

      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: 'text.primary' }}>
          {project.estimatedTotal != null ? formatPeso(project.estimatedTotal) : 'No complete store'}
        </Typography>
        {project.estimatedTotal != null && (
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            {formatPeso(project.costPerSqm)} per m² · at {project.storeName}
          </Typography>
        )}
      </Box>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.primary' }}>
        {formatMeasurement(project.floorArea, ' m²')} · {project.storeys} storey{project.storeys === 1 ? '' : 's'} · Budget {formatPeso(project.budgetCeiling)}
      </Typography>
      {project.quantities.length > 0 && (
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
          {project.quantities.map((q) => `${q.name} ${formatQuantity(q.quantity, q.unit)} ${q.unit}`).join(' · ')}
        </Typography>
      )}
    </Paper>
  );
}

export default ExploreProjectCard;

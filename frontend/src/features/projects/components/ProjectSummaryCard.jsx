import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import ProjectIcon from './ProjectIcon';

function SummaryRow({ label, value }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', py: 1.25 }}>
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.primary' }}>{value}</Typography>
    </Stack>
  );
}

/**
 * Read-only snapshot of the project currently being parsed.
 *
 * @param {object} props
 * @param {object} props.draft Project-shaped object (projectName, location, storeys,
 *   includeRoofing, budgetCeiling) — the active project while parsing.
 */
function ProjectSummaryCard({ draft }) {
  return (
    <Paper
      elevation={0}
      sx={{ borderRadius: 3, bgcolor: 'common.white', boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)', p: { xs: 2.5, md: 3 } }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: 'text.primary', mb: 2 }}>Project</Typography>

      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, mb: 1 }}>
        <ProjectIcon color="purple" />
        <Box>
          <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.95rem' }}>{draft.projectName}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{draft.location}</Typography>
        </Box>
      </Stack>

      <Divider sx={{ my: 1 }} />

      <Stack divider={<Divider />}>
        <SummaryRow label="Storeys" value={`${draft.storeys} ${draft.storeys === 1 ? 'storey' : 'storeys'}`} />
        <SummaryRow label="Roofing" value={draft.includeRoofing ? 'Included' : 'Not included'} />
        <SummaryRow label="Budget ceiling" value={`₱${draft.budgetCeiling}`} />
      </Stack>
    </Paper>
  );
}

export default ProjectSummaryCard;

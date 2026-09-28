import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ProjectIcon from './ProjectIcon';
import StatusChip from './StatusChip';
import { isProjectComplete } from '../utils/projectStatus';
import { colors } from '../../../theme/palette';

/**
 * One project in the Projects list. Clicking it (except Delete) makes it the
 * active project, which every workspace page reads from.
 *
 * @param {object} props
 * @param {object} props.project
 * @param {boolean} props.active
 * @param {() => void} props.onSelect
 * @param {() => void} props.onDeleteRequest
 */
function ProjectCard({ project, active, onSelect, onDeleteRequest }) {
  // Display only: simplifies the real status (Parsing/Estimated/Optimized/Failed,
  // see ProjectsContext) to the two labels this page shows (see isProjectComplete).
  // `project.status` itself is unchanged, and other pages still check the real value.
  const statusLabel = isProjectComplete(project) ? 'Complete' : 'Incomplete';

  return (
    <Paper
      elevation={0}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect();
      }}
      sx={{
        position: 'relative',
        borderRadius: 3,
        bgcolor: 'common.white',
        p: 2.25,
        cursor: 'pointer',
        border: '1.5px solid',
        borderColor: active ? colors.accentBlue : 'transparent',
        boxShadow: active ? `0 0 0 3px ${colors.iconBlueBg}` : '0 2px 10px rgba(20, 30, 60, 0.06)',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <ProjectIcon color={project.iconColor} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.95rem' }}>
            {project.projectName}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
            {project.storeys} {project.storeys === 1 ? 'storey' : 'storeys'} · {project.location}
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexShrink: 0,
            flexBasis: { xs: '100%', sm: 'auto' },
            mt: { xs: 1, sm: 0 },
          }}
        >
          <StatusChip label={statusLabel} />

          <Tooltip title="Delete project">
            <IconButton
              size="small"
              aria-label="Delete project"
              onClick={(event) => {
                event.stopPropagation();
                onDeleteRequest();
              }}
              sx={{ color: 'text.disabled', '&:hover': { color: colors.iconRedFg, bgcolor: colors.iconRedBg } }}
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default ProjectCard;

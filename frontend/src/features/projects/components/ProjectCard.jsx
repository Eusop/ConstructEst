import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ProjectIcon from './ProjectIcon';
import StatusChip from './StatusChip';
import { colors } from '../../../theme/palette';

/**
 * One project in the Projects list. Clicking it (anywhere but Delete) makes
 * it the active project — the source every downstream workspace page
 * (Material Estimation, Store Locator, Brand Selection, Bill of Materials)
 * reads from.
 *
 * @param {object} props
 * @param {object} props.project
 * @param {boolean} props.active
 * @param {() => void} props.onSelect
 * @param {() => void} props.onDeleteRequest
 */
function ProjectCard({ project, active, onSelect, onDeleteRequest }) {
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
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <ProjectIcon color={project.iconColor} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.95rem' }}>{project.projectName}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
            {project.storeys} {project.storeys === 1 ? 'storey' : 'storeys'} · {project.location}
          </Typography>
        </Box>

        <StatusChip label={project.status} />

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
    </Paper>
  );
}

export default ProjectCard;

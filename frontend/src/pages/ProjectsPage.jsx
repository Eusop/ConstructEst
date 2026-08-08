import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ProjectCard from '../features/projects/components/ProjectCard';
import EmptyProjectsState from '../features/projects/components/EmptyProjectsState';
import DeleteProjectDialog from '../features/projects/components/DeleteProjectDialog';
import { useProjects } from '../context/ProjectsContext';
import { ROUTES } from '../routes/paths';
import { colors } from '../theme/palette';

/**
 * Projects: the full list of created projects. Clicking a card makes it
 * the active project — what every workspace page (Material Estimation,
 * Store Locator, Brand Selection, Bill of Materials) then reads from.
 * Empty by default; no sample/placeholder rows.
 */
function ProjectsPage() {
  const { projects, activeProjectId, setActiveProject, deleteProject } = useProjects();
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const handleConfirmDelete = () => {
    deleteProject(pendingDeleteId);
    setPendingDeleteId(null);
  };

  return (
    <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0, minWidth: 0 }}>
      {projects.length > 0 && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: 'text.primary' }}>All projects</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>Select a project to make it active.</Typography>
          </Box>

          <Button
            component={RouterLink}
            to={ROUTES.NEW_PROJECT}
            variant="contained"
            disableElevation
            startIcon={<AddRoundedIcon />}
            sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark }, flexShrink: 0 }}
          >
            New project
          </Button>
        </Stack>
      )}

      {projects.length === 0 ? (
        <EmptyProjectsState />
      ) : (
        <Stack spacing={1.5}>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              active={project.id === activeProjectId}
              onSelect={() => setActiveProject(project.id)}
              onDeleteRequest={() => setPendingDeleteId(project.id)}
            />
          ))}
        </Stack>
      )}

      <DeleteProjectDialog
        open={Boolean(pendingDeleteId)}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
      />
    </Stack>
  );
}

export default ProjectsPage;

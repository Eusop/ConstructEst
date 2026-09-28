import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ProjectCard from '../features/projects/components/ProjectCard';
import ProjectStatusFilter from '../features/projects/components/ProjectStatusFilter';
import EmptyProjectsState from '../features/projects/components/EmptyProjectsState';
import TypedConfirmDialog from '../components/TypedConfirmDialog';
import { useProjects } from '../context/ProjectsContext';
import { useToast } from '../context/ToastContext';
import { isProjectComplete } from '../features/projects/utils/projectStatus';
import { ROUTES } from '../routes/paths';

/**
 * Projects: the list of created projects. Clicking a card makes it the active
 * project, which every workspace page (Material Estimation, Store Locator,
 * Brand Selection, Bill of Materials) reads from. Empty by default.
 */
function ProjectsPage() {
  const { projects, activeProjectId, setActiveProject, deleteProject } = useProjects();
  const { showToast } = useToast();
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  const pendingDeleteProject = projects.find((project) => project.id === pendingDeleteId) ?? null;

  // Same Complete/Incomplete split as ProjectCard's status tag (isProjectComplete);
  // this only decides which cards are shown.
  const filteredProjects = projects.filter((project) => {
    if (statusFilter === 'complete') return isProjectComplete(project);
    if (statusFilter === 'incomplete') return !isProjectComplete(project);
    return true;
  });

  const handleConfirmDelete = async () => {
    try {
      await deleteProject(pendingDeleteId);
      setPendingDeleteId(null);
    } catch (error) {
      showToast(error.message || 'Could not delete this project. Please try again.');
      throw error;
    }
  };

  const handleSelectProject = (projectId) => {
    setActiveProject(projectId);
    navigate(ROUTES.MATERIAL_ESTIMATION);
  };

  // Same root cause and fix as ProjectResultsPage: `flex: 1, minHeight: 0`
  // stretches this Stack to the viewport, which EmptyProjectsState wants (it
  // centers itself). With many cards it swallowed DashboardLayout's bottom
  // padding, so it is only applied when `projects.length === 0`; a populated
  // list uses natural-height flow.
  const fillsViewport = projects.length === 0;

  return (
    <Stack spacing={2.5} sx={{ flex: fillsViewport ? 1 : 'unset', minHeight: fillsViewport ? 0 : 'auto', minWidth: 0 }}>
      {projects.length > 0 && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.4rem' }, color: 'text.primary' }}>All projects</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>Select a project to make it active.</Typography>
          </Box>

          <ProjectStatusFilter value={statusFilter} onChange={setStatusFilter} />
        </Stack>
      )}

      {projects.length === 0 ? (
        <EmptyProjectsState />
      ) : filteredProjects.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'text.primary' }}>No projects match this filter.</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mt: 0.5 }}>Try a different status filter.</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              active={project.id === activeProjectId}
              onSelect={() => handleSelectProject(project.id)}
              onDeleteRequest={() => setPendingDeleteId(project.id)}
            />
          ))}
        </Stack>
      )}

      <TypedConfirmDialog
        key={pendingDeleteId ?? 'closed'}
        open={Boolean(pendingDeleteId)}
        title="Delete project"
        message={
          <>
            This permanently deletes <strong>&ldquo;{pendingDeleteProject?.projectName ?? ''}&rdquo;</strong> and
            everything computed for it. This can&apos;t be undone.
          </>
        }
        confirmLabel="Yes, Delete"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
      />
    </Stack>
  );
}

export default ProjectsPage;

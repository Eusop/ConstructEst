/**
 * Whether a project counts as "Complete" for the Projects page tag (see
 * ProjectCard) and status filter (ProjectsPage, ProjectStatusFilter): a saved
 * brand selection and generated BOM, which is when the client status becomes
 * `'Optimized'` (set in BrandSelectionPage after POST
 * /api/projects/:id/brand-selection, and on load when the project has a saved
 * brand selection). Everything else (parsing, estimated without brand selection,
 * failed) is "Incomplete". One shared helper so the tag and filter agree.
 *
 * @param {{status: string}} project
 * @returns {boolean}
 */
export function isProjectComplete(project) {
  return project.status === 'Optimized';
}

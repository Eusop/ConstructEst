/**
 * Whether a project counts as "Complete" for the Projects page's status tag
 * (see ProjectCard) and status filter (see ProjectsPage/ProjectStatusFilter)
 * — a saved brand selection and generated Bill of Materials, which is when
 * ProjectsContext's client-side status becomes `'Optimized'` (see
 * BrandSelectionPage, set right after POST /api/projects/:id/brand-selection
 * succeeds). Every other state — still parsing, estimated but no brand
 * selection yet, or a failed parse — reads as "Incomplete". Kept as one
 * shared helper so the tag and the filter can never disagree with each
 * other about which bucket a project falls into.
 *
 * @param {{status: string}} project
 * @returns {boolean}
 */
export function isProjectComplete(project) {
  return project.status === 'Optimized';
}

import { asyncHandler } from '../utils/asyncHandler.js';
import { exploreProjects, exploreProjectDetail, exploreFloorPlan } from '../services/similarProjects.service.js';

// Explore Projects: browse shared projects to see what a house of a given size
// costs. Read only. ?area=&storeys=&budget=&order=&page=
export const listExploreProjects = asyncHandler(async (req, res) => {
  res.json(await exploreProjects(req.user.id, req.query));
});

export const getExploreProject = asyncHandler(async (req, res) => {
  res.json(await exploreProjectDetail(req.params.id, req.user.id));
});

export const getExploreFloorPlan = asyncHandler(async (req, res) => {
  res.json(await exploreFloorPlan(req.params.id, req.user.id));
});

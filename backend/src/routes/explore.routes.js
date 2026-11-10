import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listExploreProjects, getExploreProject, getExploreFloorPlan } from '../controllers/explore.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', listExploreProjects);
router.get('/:id', getExploreProject);
router.get('/:id/floor-plan', getExploreFloorPlan);

export default router;

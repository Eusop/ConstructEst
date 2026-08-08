import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { uploadDxf } from '../middleware/upload.js';
import {
  listProjects,
  createProject,
  getProject,
  deleteProject,
  getProjectStores,
  getProjectBrandCatalog,
  postBrandSelection,
  getProjectBom,
  getProjectConstants,
  putProjectConstants,
  resetProjectConstants,
} from '../controllers/projects.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', listProjects);
router.post('/', uploadDxf, createProject);
router.get('/:id', getProject);
router.delete('/:id', deleteProject);

router.get('/:id/stores', getProjectStores);
router.get('/:id/brand-catalog', getProjectBrandCatalog);
router.post('/:id/brand-selection', postBrandSelection);
router.get('/:id/bom', getProjectBom);

router.get('/:id/constants', getProjectConstants);
router.put('/:id/constants', putProjectConstants);
router.delete('/:id/constants', resetProjectConstants);

export default router;

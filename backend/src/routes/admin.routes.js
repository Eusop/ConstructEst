import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  listUsers, createUser, updateUser, setUserActive,
  listMaterials, createMaterial, updateMaterial, deleteMaterial,
  createStore, updateStore, deleteStore,
  upsertStoreMaterialPrice, removeStoreMaterialPrice,
  getGlobalConstants, updateGlobalConstants,
} from '../controllers/admin.controller.js';
import { listStores } from '../controllers/stores.controller.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/users', listUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.patch('/users/:id/status', setUserActive);

router.get('/materials', listMaterials);
router.post('/materials', createMaterial);
router.put('/materials/:id', updateMaterial);
router.delete('/materials/:id', deleteMaterial);

router.get('/stores', listStores);
router.post('/stores', createStore);
router.put('/stores/:id', updateStore);
router.delete('/stores/:id', deleteStore);
router.put('/stores/:storeId/materials/:materialBrandId', upsertStoreMaterialPrice);
router.delete('/stores/:storeId/materials/:materialBrandId', removeStoreMaterialPrice);

router.get('/estimation-constants', getGlobalConstants);
router.put('/estimation-constants', updateGlobalConstants);

export default router;

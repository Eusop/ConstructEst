import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  listUsers, createUser, updateUser, setUserActive, verifyUser,
  listMaterials, createMaterial, updateMaterial, deleteMaterial,
  createStore, updateStore, deleteStore,
  getStoreCatalog, upsertStoreMaterialPrice, removeStoreMaterialPrice,
  getGlobalConstants, updateGlobalConstants,
  getGlobalDesignOverrides, updateGlobalDesignOverrides,
  listAdminActivity,
} from '../controllers/admin.controller.js';
import { listStores } from '../controllers/stores.controller.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/users', listUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.patch('/users/:id/status', setUserActive);
router.patch('/users/:id/verify', verifyUser);

// Read-only — no POST/PUT/DELETE is ever exposed for this resource.
// Entries are written server-side as a side effect of the actual mutating
// admin actions above (see admin.controller.js's logAdminActivity), never
// supplied directly by the client, so the log can't be spoofed or edited.
router.get('/activity-log', listAdminActivity);

router.get('/materials', listMaterials);
router.post('/materials', createMaterial);
router.put('/materials/:id', updateMaterial);
router.delete('/materials/:id', deleteMaterial);

router.get('/stores', listStores);
router.post('/stores', createStore);
router.put('/stores/:id', updateStore);
router.delete('/stores/:id', deleteStore);
router.get('/stores/:id/catalog', getStoreCatalog);
router.put('/stores/:storeId/materials/:materialBrandId', upsertStoreMaterialPrice);
router.delete('/stores/:storeId/materials/:materialBrandId', removeStoreMaterialPrice);

router.get('/estimation-constants', getGlobalConstants);
router.put('/estimation-constants', updateGlobalConstants);

router.get('/design-overrides', getGlobalDesignOverrides);
router.put('/design-overrides', updateGlobalDesignOverrides);

export default router;

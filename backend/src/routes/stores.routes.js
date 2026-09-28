import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listStores, roadDistances } from '../controllers/stores.controller.js';

const router = Router();

router.get('/', requireAuth, listStores);
router.post('/road-distances', requireAuth, roadDistances);

export default router;

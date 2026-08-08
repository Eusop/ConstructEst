import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listStores } from '../controllers/stores.controller.js';

const router = Router();

router.get('/', requireAuth, listStores);

export default router;

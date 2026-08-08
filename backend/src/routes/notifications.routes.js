import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listNotifications, markNotificationRead } from '../controllers/notifications.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', listNotifications);
router.patch('/:id/read', markNotificationRead);

export default router;

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { updateProfile, changePassword } from '../controllers/users.controller.js';

const router = Router();

router.put('/me', requireAuth, updateProfile);
router.put('/me/password', requireAuth, changePassword);

export default router;

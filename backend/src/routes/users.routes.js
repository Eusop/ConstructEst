import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { uploadAvatar } from '../middleware/upload.js';
import { updateProfile, changePassword, uploadProfilePhoto, removeProfilePhoto, heartbeat } from '../controllers/users.controller.js';

const router = Router();

router.put('/me', requireAuth, updateProfile);
router.put('/me/password', requireAuth, changePassword);
router.put('/me/heartbeat', requireAuth, heartbeat);
// requireAuth before uploadAvatar so the filename can include the user id.
router.post('/me/avatar', requireAuth, uploadAvatar, uploadProfilePhoto);
router.delete('/me/avatar', requireAuth, removeProfilePhoto);

export default router;

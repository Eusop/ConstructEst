import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { uploadAvatar } from '../middleware/upload.js';
import { updateProfile, changePassword, uploadProfilePhoto, removeProfilePhoto } from '../controllers/users.controller.js';

const router = Router();

router.put('/me', requireAuth, updateProfile);
router.put('/me/password', requireAuth, changePassword);
// requireAuth before uploadAvatar so the filename can include the user id.
router.post('/me/avatar', requireAuth, uploadAvatar, uploadProfilePhoto);
router.delete('/me/avatar', requireAuth, removeProfilePhoto);

export default router;

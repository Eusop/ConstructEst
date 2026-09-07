import { Router } from 'express';
import { register, login, me, verifyEmail, resendVerificationCode, checkAvailability } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.get('/check-availability', checkAvailability);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification-code', resendVerificationCode);
router.get('/me', requireAuth, me);

export default router;

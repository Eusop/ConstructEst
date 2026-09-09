import { Router } from 'express';
import { register, login, me, verifyEmail, resendVerificationCode, checkAvailability, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.get('/check-availability', checkAvailability);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification-code', resendVerificationCode);
// Public on purpose: someone who has forgotten their password cannot log in
// first. forgotPassword never confirms whether an address is registered.
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', requireAuth, me);

export default router;

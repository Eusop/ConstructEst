import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getEffectiveConstants } from '../services/constants.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Global defaults (Settings page's un-overridden baseline). Project-level
// overrides live under /api/projects/:id/constants instead.
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const constants = await getEffectiveConstants(null);
  res.json({ constants });
}));

export default router;

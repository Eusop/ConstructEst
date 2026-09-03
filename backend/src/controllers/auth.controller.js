import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { signToken } from '../services/token.service.js';
import { toPublicUser } from '../utils/serializers.js';
import { HttpError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value ?? '');
}

export const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, userId, email, prcLicense, password } = req.body;

  if (!firstName || !lastName) throw new HttpError(400, 'First and last name are required.');
  if (!userId || String(userId).length < 3) throw new HttpError(400, 'User ID must be at least 3 characters.');
  if (!isValidEmail(email)) throw new HttpError(400, 'A valid email is required.');
  if (!password || String(password).length < 6) throw new HttpError(400, 'Password must be at least 6 characters.');

  const passwordHash = bcrypt.hashSync(password, 10);

  // New self-registered accounts start unverified and inactive — an admin
  // must verify them (see admin.controller.js's verifyUser) before they can
  // sign in at all. No token is issued here: `login` already filters on
  // `is_active = 1`, but a token handed out at registration would still
  // work against every other `requireAuth`-gated route (it only checks the
  // token's signature, not the account's current is_active/is_verified
  // state) — so the account simply can't get a session until verified.
  await query(
    `INSERT INTO users (first_name, last_name, user_id, email, prc_license, password_hash, access_role, is_active, is_verified)
     VALUES (?, ?, ?, ?, ?, ?, 'user', 0, 0)`,
    [firstName, lastName, userId, email, prcLicense || null, passwordHash],
  );

  res.status(201).json({
    message: 'Account created. An admin will verify your account before you can sign in.',
    pendingVerification: true,
  });
});

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) throw new HttpError(400, 'Email/User ID and password are required.');

  const [user] = await query(
    'SELECT * FROM users WHERE (email = ? OR user_id = ?) AND is_active = 1',
    [identifier, identifier],
  );

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new HttpError(401, 'Incorrect email/User ID or password.');
  }

  const token = signToken(user);
  res.json({ token, user: toPublicUser(user) });
});

export const me = asyncHandler(async (req, res) => {
  const [user] = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user) throw new HttpError(404, 'User not found.');
  res.json({ user: toPublicUser(user) });
});

import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { toPublicUser } from '../utils/serializers.js';
import { HttpError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isValidPassword, PASSWORD_RULE_MESSAGE } from '../utils/passwordPolicy.js';
import { AVATAR_DIR } from '../middleware/upload.js';
import { sendPasswordChangedEmail } from '../services/mailer.service.js';

export const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, avatarUrl } = req.body;
  const fields = [];
  const params = [];

  if (firstName !== undefined) { fields.push('first_name = ?'); params.push(firstName); }
  if (lastName !== undefined) { fields.push('last_name = ?'); params.push(lastName); }
  if (email !== undefined) { fields.push('email = ?'); params.push(email); }
  if (avatarUrl !== undefined) { fields.push('avatar_url = ?'); params.push(avatarUrl); }

  if (fields.length === 0) throw new HttpError(400, 'No fields to update.');

  params.push(req.user.id);
  await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);

  const [user] = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: toPublicUser(user) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!isValidPassword(newPassword)) throw new HttpError(400, PASSWORD_RULE_MESSAGE);

  const [user] = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user || !bcrypt.compareSync(currentPassword || '', user.password_hash)) {
    throw new HttpError(401, 'Current password is incorrect.');
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.user.id]);

  // Email the user that their password changed, so they notice a change they
  // did not make. The password is already changed, so a mail failure must
  // not be reported as a failure.
  notifyPasswordChanged(user);

  res.json({ message: 'Password updated.' });
});

/**
 * POST /api/users/me/avatar (multipart, field name `avatar`).
 * Saves the photo on disk and stores its path, so it survives logout.
 */
export const uploadProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'No image was uploaded.');

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  const [previous] = await query('SELECT avatar_url FROM users WHERE id = ?', [req.user.id]);
  await query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, req.user.id]);

  // Delete the old photo so replacing it does not leave orphaned files.
  // Best effort: a missing file is fine and should not fail the upload.
  removeStoredAvatar(previous?.avatar_url);

  const [user] = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.status(201).json({ user: toPublicUser(user) });
});

/**
 * PUT /api/users/me/heartbeat (no body, no response content). The frontend
 * polls it (see UserContext.jsx) so the admin "online now" dot stays accurate.
 */
export const heartbeat = asyncHandler(async (req, res) => {
  await query('UPDATE users SET last_seen_at = NOW() WHERE id = ?', [req.user.id]);
  res.status(204).end();
});

/** DELETE /api/users/me/avatar: goes back to the generated initials. */
export const removeProfilePhoto = asyncHandler(async (req, res) => {
  const [previous] = await query('SELECT avatar_url FROM users WHERE id = ?', [req.user.id]);
  await query('UPDATE users SET avatar_url = NULL WHERE id = ?', [req.user.id]);
  removeStoredAvatar(previous?.avatar_url);

  const [user] = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: toPublicUser(user) });
});

function removeStoredAvatar(avatarUrl) {
  if (!avatarUrl) return;
  // Only unlink inside the avatars folder, and only the basename, so a bad
  // stored path can't reach other files.
  const filename = path.basename(avatarUrl);
  fs.rm(path.join(AVATAR_DIR, filename), { force: true }, () => {});
}

function notifyPasswordChanged(user) {
  sendPasswordChangedEmail(user.email, `${user.first_name} ${user.last_name}`.trim())
    .catch((err) => console.error('Could not send password-change notification:', err.message));
}

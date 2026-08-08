import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { toPublicUser } from '../utils/serializers.js';
import { HttpError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';

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
  if (!newPassword || String(newPassword).length < 6) {
    throw new HttpError(400, 'New password must be at least 6 characters.');
  }

  const [user] = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user || !bcrypt.compareSync(currentPassword || '', user.password_hash)) {
    throw new HttpError(401, 'Current password is incorrect.');
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.user.id]);
  res.json({ message: 'Password updated.' });
});

import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { toPublicUser } from '../utils/serializers.js';
import { HttpError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isValidPassword, PASSWORD_RULE_MESSAGE } from '../utils/passwordPolicy.js';
import { AVATAR_DIR } from '../middleware/upload.js';
import { sendPasswordChangedEmail, sendEmailChangeCodeEmail, sendEmailChangedNoticeEmail } from '../services/mailer.service.js';
import { generateVerificationCode, CODE_EXPIRY_MINUTES, RESEND_COOLDOWN_SECONDS } from '../services/passwordReset.service.js';
import { isValidEmail, isValidCode } from '../utils/email.js';

const MAX_CODE_ATTEMPTS = 5;

export const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, avatarUrl } = req.body;
  const fields = [];
  const params = [];

  if (firstName !== undefined) { fields.push('first_name = ?'); params.push(firstName); }
  if (lastName !== undefined) { fields.push('last_name = ?'); params.push(lastName); }
  // A new email needs the code sent to it (requestEmailChange below), so it
  // can't be saved here. The same email is ignored.
  if (email !== undefined) {
    const [current] = await query('SELECT email FROM users WHERE id = ?', [req.user.id]);
    if (String(email).trim().toLowerCase() !== String(current?.email ?? '').toLowerCase()) {
      throw new HttpError(400, 'To change your email, confirm it with the code we send to the new address.', 'EMAIL_CHANGE_NEEDS_CODE');
    }
  }
  if (avatarUrl !== undefined) { fields.push('avatar_url = ?'); params.push(avatarUrl); }

  if (fields.length === 0) throw new HttpError(400, 'No fields to update.');

  params.push(req.user.id);
  await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);

  const [user] = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: toPublicUser(user) });
});

// Email change, step 1: send a code to the new address. The email only
// changes after the code is entered (IT test TC-U25).
export const requestEmailChange = asyncHandler(async (req, res) => {
  const email = String(req.body.email ?? '').trim();
  if (!isValidEmail(email)) throw new HttpError(400, 'Enter a valid email address.');
  const [user] = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (email.toLowerCase() === user.email.toLowerCase()) throw new HttpError(400, 'That is already your email.');
  const [taken] = await query('SELECT id FROM users WHERE email = ? AND id != ?', [email, user.id]);
  if (taken) throw new HttpError(409, 'That email address is already in use.');

  if (user.email_change_last_sent_at) {
    const elapsed = (Date.now() - new Date(user.email_change_last_sent_at).getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      throw new HttpError(429, `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed)}s before requesting another code.`, 'RESEND_COOLDOWN');
    }
  }

  const code = generateVerificationCode();
  try {
    await sendEmailChangeCodeEmail(email, code);
  } catch (err) {
    console.error('Failed to send email change code:', err);
    throw new HttpError(502, "We couldn't send a code to that address. Check it and try again.", 'EMAIL_SEND_FAILED');
  }
  await query(
    `UPDATE users SET pending_email = ?, email_change_code = ?, email_change_expires_at = NOW() + INTERVAL ${CODE_EXPIRY_MINUTES} MINUTE,
                       email_change_attempts = 0, email_change_last_sent_at = NOW()
     WHERE id = ?`,
    [email, code, user.id],
  );
  res.json({ message: `We sent a 6-digit code to ${email}.`, pendingEmail: email });
});

// Email change, step 2: the code from the new address switches the email.
export const confirmEmailChange = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!isValidCode(code)) throw new HttpError(400, 'Enter the 6-digit code.');
  const [user] = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user.pending_email) throw new HttpError(400, 'There is no email change waiting. Start again.', 'NO_PENDING_EMAIL');

  const expired = !user.email_change_code || !user.email_change_expires_at
    || new Date(user.email_change_expires_at).getTime() < Date.now();
  if (expired) throw new HttpError(400, 'That code has expired. Request a new one.', 'CODE_EXPIRED');

  if (String(code) !== user.email_change_code) {
    const attempts = user.email_change_attempts + 1;
    if (attempts >= MAX_CODE_ATTEMPTS) {
      await query('UPDATE users SET email_change_code = NULL, email_change_expires_at = NULL, email_change_attempts = 0 WHERE id = ?', [user.id]);
      throw new HttpError(400, 'Too many incorrect attempts. Request a new code.', 'TOO_MANY_ATTEMPTS');
    }
    await query('UPDATE users SET email_change_attempts = ? WHERE id = ?', [attempts, user.id]);
    throw new HttpError(400, `Incorrect code. ${MAX_CODE_ATTEMPTS - attempts} attempt(s) left.`, 'INVALID_CODE');
  }

  // Someone may have signed up with it since the code was sent.
  const [taken] = await query('SELECT id FROM users WHERE email = ? AND id != ?', [user.pending_email, user.id]);
  if (taken) throw new HttpError(409, 'That email address is already in use.');

  const oldEmail = user.email;
  await query(
    `UPDATE users SET email = pending_email, email_verified_at = NOW(), pending_email = NULL, email_change_code = NULL,
                       email_change_expires_at = NULL, email_change_attempts = 0
     WHERE id = ?`,
    [user.id],
  );
  const [updated] = await query('SELECT * FROM users WHERE id = ?', [user.id]);
  // The old inbox is told, in case the change was not the owner's.
  sendEmailChangedNoticeEmail(oldEmail, updated.email, updated.first_name).catch((err) => console.error('Email change notice failed:', err));
  res.json({ message: 'Email changed.', user: toPublicUser(updated) });
});

// Cancel button: forget the waiting email and its code.
export const cancelEmailChange = asyncHandler(async (req, res) => {
  await query(
    'UPDATE users SET pending_email = NULL, email_change_code = NULL, email_change_expires_at = NULL, email_change_attempts = 0 WHERE id = ?',
    [req.user.id],
  );
  res.status(204).end();
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

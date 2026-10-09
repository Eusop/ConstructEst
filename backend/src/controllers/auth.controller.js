import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { signToken } from '../services/token.service.js';
import { generateUserId } from '../services/userId.service.js';
import { toPublicUser } from '../utils/serializers.js';
import { HttpError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isValidPassword, PASSWORD_RULE_MESSAGE } from '../utils/passwordPolicy.js';
import { sendVerificationCodeEmail, sendPasswordChangedEmail } from '../services/mailer.service.js';
import { generateVerificationCode, cooldownSecondsLeft, issuePasswordResetCode } from '../services/passwordReset.service.js';

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value ?? '');
}

// Email verification settings. 10 min is enough time to check your inbox
// and type the code back in. 45s cooldown stops spamming "Resend". After 5
// wrong tries the code gets invalidated so you have to request a new one.
const CODE_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 45;
const MAX_CODE_ATTEMPTS = 5;

function isValidCode(value) {
  return /^\d{6}$/.test(String(value ?? ''));
}

export const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName) throw new HttpError(400, 'First and last name are required.');
  if (!isValidEmail(email)) throw new HttpError(400, 'A valid email is required.');
  if (!isValidPassword(password)) throw new HttpError(400, PASSWORD_RULE_MESSAGE);

  // Stop here before using up a User ID number on an email that is taken.
  const [existing] = await query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) throw new HttpError(409, 'That email address is already in use.');

  const passwordHash = bcrypt.hashSync(password, 10);
  const code = generateVerificationCode();
  const userId = await generateUserId();

  // No admin approval (FR-1, Form 12): the account is active once the email
  // is verified. No token given here, since the email code comes first.
  const insertResult = await query(
    `INSERT INTO users (first_name, last_name, user_id, email, password_hash, access_role, is_active, is_verified,
                         email_verification_code, email_verification_expires_at, email_verification_last_sent_at)
     VALUES (?, ?, ?, ?, ?, 'user', 1, 1, ?, NOW() + INTERVAL ${CODE_EXPIRY_MINUTES} MINUTE, NOW())`,
    [firstName, lastName, userId, email, passwordHash, code],
  );

  try {
    await sendVerificationCodeEmail(email, code, userId);
  } catch (err) {
    // If the email fails, delete the new row. Otherwise the unique email
    // would block that person from registering again.
    await query('DELETE FROM users WHERE id = ?', [insertResult.insertId]);
    console.error('Failed to send verification email:', err);
    throw new HttpError(400, "We couldn't send a verification email to that address. Double-check it and try again.", 'EMAIL_SEND_FAILED');
  }

  res.status(201).json({
    message: 'Account created. Check your email for a 6-digit code to verify your address.',
    pendingVerification: true,
    userId,
  });
});

// Only this column is allowed, never taken directly from the request.
const AVAILABILITY_FIELDS = { email: 'email' };

// Used by the sign up form to check live if an email is already taken,
// before the user even submits.
export const checkAvailability = asyncHandler(async (req, res) => {
  const { field, value } = req.query;
  const column = AVAILABILITY_FIELDS[field];
  if (!column) throw new HttpError(400, 'field must be "email".');
  if (!value) throw new HttpError(400, 'value is required.');

  const [existing] = await query(`SELECT id FROM users WHERE ${column} = ?`, [value]);
  res.json({ available: !existing });
});

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) throw new HttpError(400, 'Email/User ID and password are required.');

  // Fetch the user even if pending or deactivated, so a wrong password gives
  // the same generic error either way. Trim since a copied ID may have spaces.
  const [user] = await query(
    'SELECT * FROM users WHERE (email = ? OR user_id = ?)',
    [identifier, String(identifier).trim()],
  );

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new HttpError(401, 'Incorrect email/User ID or password.');
  }

  // The email must be verified first. There is no admin approval step.
  if (!user.email_verified_at) {
    throw new HttpError(403, 'Please verify your email before signing in.', 'EMAIL_NOT_VERIFIED', user.email);
  }
  if (!user.is_active) {
    throw new HttpError(403, 'This account has been deactivated.', 'ACCOUNT_DEACTIVATED');
  }
  // A temporary password from an admin only works for 24 hours.
  if (user.must_change_password && user.temp_password_expires_at
      && new Date(user.temp_password_expires_at).getTime() < Date.now()) {
    throw new HttpError(401, 'This temporary password has expired. Ask your administrator for a new one.', 'TEMP_PASSWORD_EXPIRED');
  }

  // Feeds the admin "online now" dot (migration 015). The heartbeat keeps it
  // fresh afterward (users.controller.js).
  await query('UPDATE users SET last_seen_at = NOW() WHERE id = ?', [user.id]);

  const token = signToken(user);
  res.json({ token, user: toPublicUser(user) });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  if (!isValidEmail(email)) throw new HttpError(400, 'A valid email is required.');
  if (!isValidCode(code)) throw new HttpError(400, 'Enter the 6-digit code.');

  const [user] = await query('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) throw new HttpError(404, 'No account found for that email.', 'ACCOUNT_NOT_FOUND');
  if (user.email_verified_at) throw new HttpError(400, 'This email is already verified.', 'ALREADY_VERIFIED');

  // Treat "no code", "expired", and "too many attempts" the same way,
  // since the fix is the same either way: request a new code.
  const expired = !user.email_verification_code
    || !user.email_verification_expires_at
    || new Date(user.email_verification_expires_at).getTime() < Date.now();
  if (expired) throw new HttpError(400, 'That code has expired. Request a new one.', 'CODE_EXPIRED');

  if (code !== user.email_verification_code) {
    const attempts = user.email_verification_attempts + 1;
    if (attempts >= MAX_CODE_ATTEMPTS) {
      await query(
        'UPDATE users SET email_verification_code = NULL, email_verification_expires_at = NULL, email_verification_attempts = 0 WHERE id = ?',
        [user.id],
      );
      throw new HttpError(400, 'Too many incorrect attempts. Request a new code.', 'TOO_MANY_ATTEMPTS');
    }
    await query('UPDATE users SET email_verification_attempts = ? WHERE id = ?', [attempts, user.id]);
    throw new HttpError(400, `Incorrect code. ${MAX_CODE_ATTEMPTS - attempts} attempt(s) left.`, 'INVALID_CODE');
  }

  await query(
    `UPDATE users SET email_verified_at = NOW(), email_verification_code = NULL,
                       email_verification_expires_at = NULL, email_verification_attempts = 0
     WHERE id = ?`,
    [user.id],
  );
  res.json({ message: 'Email verified. You can now sign in.', approved: true });
});

export const resendVerificationCode = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!isValidEmail(email)) throw new HttpError(400, 'A valid email is required.');

  const [user] = await query('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) throw new HttpError(404, 'No account found for that email.', 'ACCOUNT_NOT_FOUND');
  if (user.email_verified_at) throw new HttpError(400, 'This email is already verified.', 'ALREADY_VERIFIED');

  if (user.email_verification_last_sent_at) {
    const elapsedSeconds = (Date.now() - new Date(user.email_verification_last_sent_at).getTime()) / 1000;
    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds);
      throw new HttpError(429, `Please wait ${wait}s before requesting another code.`, 'RESEND_COOLDOWN');
    }
  }

  // Emails can be delayed and arrive out of order, so while the code is still
  // valid we send the same one again. Then any of the emails works. Expiry and
  // wrong attempts are kept, so resending gives no extra guesses.
  const stillValid = user.email_verification_code && user.email_verification_expires_at
    && new Date(user.email_verification_expires_at).getTime() > Date.now();
  const code = stillValid ? user.email_verification_code : generateVerificationCode();
  // Send first, save after, so a failed send keeps the old code working.
  try {
    await sendVerificationCodeEmail(user.email, code, user.user_id);
  } catch (err) {
    console.error('Failed to resend verification email:', err);
    throw new HttpError(502, 'Could not send the email. Try again in a moment.', 'EMAIL_SEND_FAILED');
  }

  if (stillValid) {
    await query('UPDATE users SET email_verification_last_sent_at = NOW() WHERE id = ?', [user.id]);
    res.json({ message: 'We sent your code again. It is the same code as before.' });
    return;
  }
  await query(
    `UPDATE users SET email_verification_code = ?, email_verification_expires_at = NOW() + INTERVAL ${CODE_EXPIRY_MINUTES} MINUTE,
                       email_verification_last_sent_at = NOW(), email_verification_attempts = 0
     WHERE id = ?`,
    [code, user.id],
  );
  res.json({ message: 'A new code has been sent to your email.' });
});

// Same wording no matter what happened, so the response can't be used to
// find out which email addresses have accounts here.
const FORGOT_PASSWORD_REPLY = 'If that email has an account, a reset code is on its way.';

/**
 * POST /auth/forgot-password { email }
 *
 * Always answers 200 with the same message, whether or not the address has an
 * account or is on cooldown. Any difference would let someone find out which
 * emails are registered.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!isValidEmail(email)) throw new HttpError(400, 'A valid email is required.');

  const [user] = await query('SELECT * FROM users WHERE email = ?', [email]);

  // Every early return below still sends the same 200.
  if (!user) return res.json({ message: FORGOT_PASSWORD_REPLY });

  if (cooldownSecondsLeft(user) > 0) return res.json({ message: FORGOT_PASSWORD_REPLY });

  try {
    await issuePasswordResetCode(user);
  } catch (err) {
    // Ignored on purpose: reporting a send failure would confirm the address exists.
    console.error('Failed to send password reset email:', err);
  }
  return res.json({ message: FORGOT_PASSWORD_REPLY });
});

/**
 * POST /auth/reset-password { email, code, newPassword }
 *
 * Checks the code the same way as verifyEmail (expiry, attempt cap, error
 * codes). Unlike forgot-password it reports real errors, since the caller
 * already holds a code that was emailed to that address.
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!isValidEmail(email)) throw new HttpError(400, 'A valid email is required.');
  if (!isValidCode(code)) throw new HttpError(400, 'Enter the 6-digit code.');
  if (!isValidPassword(newPassword)) throw new HttpError(400, PASSWORD_RULE_MESSAGE);

  const [user] = await query('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) throw new HttpError(400, 'That code has expired. Request a new one.', 'CODE_EXPIRED');

  const expired = !user.password_reset_code
    || !user.password_reset_expires_at
    || new Date(user.password_reset_expires_at).getTime() < Date.now();
  if (expired) throw new HttpError(400, 'That code has expired. Request a new one.', 'CODE_EXPIRED');

  if (code !== user.password_reset_code) {
    const attempts = user.password_reset_attempts + 1;
    if (attempts >= MAX_CODE_ATTEMPTS) {
      await query(
        'UPDATE users SET password_reset_code = NULL, password_reset_expires_at = NULL, password_reset_attempts = 0 WHERE id = ?',
        [user.id],
      );
      throw new HttpError(400, 'Too many incorrect attempts. Request a new code.', 'TOO_MANY_ATTEMPTS');
    }
    await query('UPDATE users SET password_reset_attempts = ? WHERE id = ?', [attempts, user.id]);
    throw new HttpError(400, `Incorrect code. ${MAX_CODE_ATTEMPTS - attempts} attempt(s) left.`, 'INVALID_CODE');
  }

  // Clearing the code in the same statement stops it from being reused.
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  await query(
    `UPDATE users SET password_hash = ?, password_reset_code = NULL,
                       password_reset_expires_at = NULL, password_reset_attempts = 0
     WHERE id = ?`,
    [passwordHash, user.id],
  );

  // Same notification as the logged-in change. Not awaited: the password is
  // already changed either way.
  sendPasswordChangedEmail(user.email, `${user.first_name} ${user.last_name}`.trim())
    .catch((err) => console.error('Could not send password-change notification:', err.message));

  res.json({ message: 'Password updated. You can sign in with your new password.' });
});

/**
 * POST /auth/set-new-password { newPassword }
 *
 * After signing in with a temporary password from an admin, the user must pick
 * their own before using the app (requireAuth blocks everything else). Returns
 * a fresh token without the must-change flag.
 */
export const setNewPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!isValidPassword(newPassword)) throw new HttpError(400, PASSWORD_RULE_MESSAGE);

  const [user] = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user) throw new HttpError(404, 'User not found.');
  if (!user.must_change_password) throw new HttpError(400, 'Your password does not need to be changed. Use Profile to change it.');
  if (bcrypt.compareSync(newPassword, user.password_hash)) {
    throw new HttpError(400, 'Choose a password different from the temporary one.');
  }

  await query(
    'UPDATE users SET password_hash = ?, must_change_password = 0, temp_password_expires_at = NULL WHERE id = ?',
    [bcrypt.hashSync(newPassword, 10), user.id],
  );
  const updated = { ...user, must_change_password: 0, temp_password_expires_at: null };

  sendPasswordChangedEmail(user.email, `${user.first_name} ${user.last_name}`.trim())
    .catch((err) => console.error('Could not send password-change notification:', err.message));

  res.json({ token: signToken(updated), user: toPublicUser(updated) });
});

export const me = asyncHandler(async (req, res) => {
  const [user] = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user) throw new HttpError(404, 'User not found.');
  res.json({ user: toPublicUser(user) });
});

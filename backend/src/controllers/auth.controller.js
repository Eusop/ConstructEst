import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { signToken } from '../services/token.service.js';
import { toPublicUser } from '../utils/serializers.js';
import { HttpError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendVerificationCodeEmail } from '../services/mailer.service.js';

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value ?? '');
}

// Email verification settings. 10 min is enough time to check your inbox
// and type the code back in. 45s cooldown stops spamming "Resend". After 5
// wrong tries the code gets invalidated so you have to request a new one.
const CODE_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 45;
const MAX_CODE_ATTEMPTS = 5;

function generateVerificationCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function isValidCode(value) {
  return /^\d{6}$/.test(String(value ?? ''));
}

export const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, employeeId, email, password } = req.body;

  if (!firstName || !lastName) throw new HttpError(400, 'First and last name are required.');
  if (!employeeId || String(employeeId).length < 3) throw new HttpError(400, 'Employee ID must be at least 3 characters.');
  if (!isValidEmail(email)) throw new HttpError(400, 'A valid email is required.');
  if (!password || String(password).length < 6) throw new HttpError(400, 'Password must be at least 6 characters.');

  const passwordHash = bcrypt.hashSync(password, 10);
  const code = generateVerificationCode();

  // New accounts start inactive and unverified, admin has to approve them
  // later (see verifyUser). No token given here so they can't log in yet.
  // Also saves a verification code right away since that's checked first.
  const insertResult = await query(
    `INSERT INTO users (first_name, last_name, employee_id, email, password_hash, access_role, is_active, is_verified,
                         email_verification_code, email_verification_expires_at, email_verification_last_sent_at)
     VALUES (?, ?, ?, ?, ?, 'user', 0, 0, ?, NOW() + INTERVAL ${CODE_EXPIRY_MINUTES} MINUTE, NOW())`,
    [firstName, lastName, employeeId, email, passwordHash, code],
  );

  try {
    await sendVerificationCodeEmail(email, code);
  } catch (err) {
    // If the email fails to send, delete the row instead of leaving a
    // dead account behind (email/employeeId are unique, so it would block
    // that person from ever registering again). Worst case they just retry.
    await query('DELETE FROM users WHERE id = ?', [insertResult.insertId]);
    console.error('Failed to send verification email:', err);
    throw new HttpError(400, "We couldn't send a verification email to that address. Double-check it and try again.", 'EMAIL_SEND_FAILED');
  }

  res.status(201).json({
    message: 'Account created. Check your email for a 6-digit code to verify your address.',
    pendingVerification: true,
  });
});

// Only these two columns are allowed, never taken directly from the request.
const AVAILABILITY_FIELDS = { email: 'email', employeeId: 'employee_id' };

// Used by the sign up form to check live if an email/Employee ID is
// already taken, before the user even submits.
export const checkAvailability = asyncHandler(async (req, res) => {
  const { field, value } = req.query;
  const column = AVAILABILITY_FIELDS[field];
  if (!column) throw new HttpError(400, 'field must be "email" or "employeeId".');
  if (!value) throw new HttpError(400, 'value is required.');

  const [existing] = await query(`SELECT id FROM users WHERE ${column} = ?`, [value]);
  res.json({ available: !existing });
});

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) throw new HttpError(400, 'Email/Employee ID and password are required.');

  // Still fetch the user even if they're pending/deactivated, so a wrong
  // password gives the same generic error either way (no hinting whether
  // the account exists).
  const [user] = await query(
    'SELECT * FROM users WHERE (email = ? OR employee_id = ?)',
    [identifier, identifier],
  );

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new HttpError(401, 'Incorrect email/Employee ID or password.');
  }

  // Check email verification first since that's the earliest step. An
  // admin could technically approve an account before its email is
  // verified, so login still needs to block on it separately.
  if (!user.email_verified_at) {
    throw new HttpError(403, 'Please verify your email before signing in.', 'EMAIL_NOT_VERIFIED', user.email);
  }
  if (!user.is_verified) {
    throw new HttpError(403, "Your account hasn't been approved by an admin yet.", 'PENDING_VERIFICATION');
  }
  if (!user.is_active) {
    throw new HttpError(403, 'This account has been deactivated.', 'ACCOUNT_DEACTIVATED');
  }

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
  res.json({ message: 'Email verified. An admin will review your account next.' });
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

  const code = generateVerificationCode();
  // Send first, save after. If sending fails, the old code still works
  // instead of getting wiped out for nothing.
  try {
    await sendVerificationCodeEmail(email, code);
  } catch (err) {
    console.error('Failed to resend verification email:', err);
    throw new HttpError(502, 'Could not send the email. Try again in a moment.', 'EMAIL_SEND_FAILED');
  }

  await query(
    `UPDATE users SET email_verification_code = ?, email_verification_expires_at = NOW() + INTERVAL ${CODE_EXPIRY_MINUTES} MINUTE,
                       email_verification_last_sent_at = NOW(), email_verification_attempts = 0
     WHERE id = ?`,
    [code, user.id],
  );
  res.json({ message: 'A new code has been sent to your email.' });
});

export const me = asyncHandler(async (req, res) => {
  const [user] = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user) throw new HttpError(404, 'User not found.');
  res.json({ user: toPublicUser(user) });
});

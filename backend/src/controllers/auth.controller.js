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

// Email-ownership verification (new, independent from is_verified/is_active
// below — see db/migrations/012_users_email_verification.sql). 10 minutes
// is long enough for a tester on a different device to switch to their mail
// app and type the code back in; 45s stops an impatient double-click on
// "Resend" from hammering Gmail's own per-App-Password sending rate; 5
// wrong guesses invalidates the code (forcing a fresh resend) rather than a
// permanent lockout, since resend already solves "I mistyped it" for free.
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

  // New self-registered accounts start unverified and inactive — an admin
  // must verify them (see admin.controller.js's verifyUser) before they can
  // sign in at all. No token is issued here: `login` already filters on
  // `is_active = 1`, but a token handed out at registration would still
  // work against every other `requireAuth`-gated route (it only checks the
  // token's signature, not the account's current is_active/is_verified
  // state) — so the account simply can't get a session until verified.
  // Also seeded with a fresh email-verification code — that's the actual
  // first gate now (see login below), ahead of admin approval.
  const insertResult = await query(
    `INSERT INTO users (first_name, last_name, employee_id, email, password_hash, access_role, is_active, is_verified,
                         email_verification_code, email_verification_expires_at, email_verification_last_sent_at)
     VALUES (?, ?, ?, ?, ?, 'user', 0, 0, ?, NOW() + INTERVAL ${CODE_EXPIRY_MINUTES} MINUTE, NOW())`,
    [firstName, lastName, employeeId, email, passwordHash, code],
  );

  try {
    await sendVerificationCodeEmail(email, code);
  } catch (err) {
    // Roll back the row rather than leaving it stranded: email/employee_id
    // are UNIQUE, so a left-behind unverifiable row would permanently squat
    // both, with no account to log into to even request a resend. The
    // trade-off (a transient Gmail hiccup wrongly failing an otherwise-good
    // registration, forcing a harmless retry) is accepted as strictly
    // better than that dead end.
    await query('DELETE FROM users WHERE id = ?', [insertResult.insertId]);
    console.error('Failed to send verification email:', err);
    throw new HttpError(400, "We couldn't send a verification email to that address. Double-check it and try again.", 'EMAIL_SEND_FAILED');
  }

  res.status(201).json({
    message: 'Account created. Check your email for a 6-digit code to verify your address.',
    pendingVerification: true,
  });
});

// Column names come only from this fixed map, never interpolated from the
// request directly — safe against injection despite the raw SQL below.
const AVAILABILITY_FIELDS = { email: 'email', employeeId: 'employee_id' };

// Live pre-submit check for SignUpForm.jsx's debounced "is this email/
// Employee ID already taken" indicator — reveals nothing register's own
// ER_DUP_ENTRY handling (see errorHandler.js's describeDuplicateEntry)
// doesn't already reveal at submit time; this just surfaces it earlier, as
// the user types, instead of only after a full submit attempt.
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

  // No `is_active` filter here (unlike before) — a pending/deactivated
  // account still needs to be fetched so a *correct* password can be told
  // apart from a *wrong* one below. Only after the password checks out do
  // we look at is_verified/is_active, so a wrong password on a pending or
  // deactivated account still gets the generic message, never a hint that
  // the identifier exists.
  const [user] = await query(
    'SELECT * FROM users WHERE (email = ? OR employee_id = ?)',
    [identifier, identifier],
  );

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new HttpError(401, 'Incorrect email/Employee ID or password.');
  }

  // Checked first, ahead of is_verified/is_active — email confirmation is
  // the causally-first step in the pipeline (register -> confirm email ->
  // admin review -> active), so it's the one thing a not-yet-verified user
  // should always be told first, regardless of whatever an admin has
  // already done (an admin *can* approve an email-unconfirmed account —
  // see admin.controller.js's verifyUser — this check re-gates login
  // independently either way).
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

  // NULL/expired/invalidated-after-5-attempts all read the same to the user
  // ("request a new one"), so one error code covers all three uniformly.
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
  // Sent before it's persisted: a failed send leaves the previous code/
  // expiry/cooldown untouched (a still-valid earlier code keeps working)
  // rather than silently invalidating it on a transient Gmail hiccup.
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

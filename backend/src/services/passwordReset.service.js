import crypto from 'node:crypto';
import { query } from '../config/db.js';
import { sendPasswordResetCodeEmail, sendVerificationCodeEmail } from './mailer.service.js';

// Shared by Forgot password (auth.controller.js) and the admin "Send reset
// code" action (admin.controller.js), so both send and save codes the same way.
export const CODE_EXPIRY_MINUTES = 10;
export const RESEND_COOLDOWN_SECONDS = 45;
export const TEMP_PASSWORD_HOURS = 24;

export function generateVerificationCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Seconds left before another code may be sent, 0 if one can be sent now. */
export function cooldownSecondsLeft(user) {
  if (!user.password_reset_last_sent_at) return 0;
  const elapsed = (Date.now() - new Date(user.password_reset_last_sent_at).getTime()) / 1000;
  return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed));
}

/** Emails a new reset code, then saves it. Sends first so a failed send keeps
 * the previous code usable. Throws if the email can't be sent. */
export async function issuePasswordResetCode(user, { byAdmin = false } = {}) {
  const code = generateVerificationCode();
  await sendPasswordResetCodeEmail(user.email, code, { byAdmin });
  await query(
    `UPDATE users SET password_reset_code = ?, password_reset_expires_at = NOW() + INTERVAL ${CODE_EXPIRY_MINUTES} MINUTE,
                       password_reset_last_sent_at = NOW(), password_reset_attempts = 0
     WHERE id = ?`,
    [code, user.id],
  );
}

/** Saves a new email verification code (the signup code) and emails it.
 * Used when an admin creates an account or changes its email. Returns false
 * if the email could not be sent; the code is saved either way, and the user
 * can ask for a new one on the sign-in screen. */
export async function issueEmailVerificationCode(user) {
  const code = generateVerificationCode();
  await query(
    `UPDATE users SET email_verification_code = ?, email_verification_expires_at = NOW() + INTERVAL ${CODE_EXPIRY_MINUTES} MINUTE,
                       email_verification_last_sent_at = NOW(), email_verification_attempts = 0
     WHERE id = ?`,
    [code, user.id],
  );
  try {
    await sendVerificationCodeEmail(user.email, code, user.user_id);
    return true;
  } catch (err) {
    console.error('Failed to send verification email:', err);
    return false;
  }
}

// No look-alike characters (0/O, 1/l/I), so the password can be read out or
// typed from a screen without mistakes.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%*?';

/** 12 random characters with at least one of each kind, so it passes the
 * password policy (passwordPolicy.js). */
export function generateTemporaryPassword() {
  const pick = (set) => set[crypto.randomInt(0, set.length)];
  const all = UPPER + LOWER + DIGITS + SYMBOLS;
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < 12) chars.push(pick(all));
  // Shuffle so the required kinds are not always first.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

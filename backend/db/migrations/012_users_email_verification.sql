-- Adds email-ownership verification as a new, independent concept from
-- is_verified (admin approval — see 008_users_is_verified.sql). A
-- self-registered account must now type back a 6-digit code emailed to the
-- address they gave before an admin's approval even matters (see
-- auth.controller.js's register/verifyEmail/resendVerificationCode and
-- login's new EMAIL_NOT_VERIFIED check, which runs before is_verified).
-- email_verified_at is a timestamp, not a boolean, so it doubles as a free
-- "when" audit trail. The code is stored in plaintext — it's random,
-- single-use, 10-minute-lived, and invalidated after 5 wrong guesses, so
-- hashing it protects nothing a password hash actually needs to protect.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/012_users_email_verification.sql

USE constructest;

ALTER TABLE users
  ADD COLUMN email_verified_at TIMESTAMP NULL AFTER is_verified,
  ADD COLUMN email_verification_code CHAR(6) NULL AFTER email_verified_at,
  ADD COLUMN email_verification_expires_at TIMESTAMP NULL AFTER email_verification_code,
  ADD COLUMN email_verification_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER email_verification_expires_at,
  ADD COLUMN email_verification_last_sent_at TIMESTAMP NULL AFTER email_verification_attempts;

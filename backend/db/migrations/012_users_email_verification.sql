-- Adds email verification, separate from is_verified (admin approval, see 008).
-- A self-registered account must type back a 6-digit emailed code (see
-- register, verifyEmail and resendVerificationCode in auth.controller.js) and
-- login checks it first (EMAIL_NOT_VERIFIED). email_verified_at is a timestamp
-- so it also records when. The code is stored in plain text since it is
-- random, single-use, expires in 10 minutes and locks after 5 wrong tries.
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

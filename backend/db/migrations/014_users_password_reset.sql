-- Adds the "forgot password" reset flow. The Login page has always had a
-- "Forgot password?" link, but it was <a href="#"> with no route, no page and
-- no endpoint behind it, so it did nothing at all.
--
-- These are deliberately their own columns rather than reusing the
-- email_verification_* set from 012. The two flows can legitimately overlap:
-- someone who registered but never typed their signup code can still ask to
-- reset their password, and sharing one column would let either flow wipe the
-- other's live code. Same storage reasoning as 012 applies to the code itself
-- -- random, single-use, 10-minute-lived, invalidated after 5 wrong guesses,
-- so hashing it would protect nothing that matters.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/014_users_password_reset.sql

USE constructest;

ALTER TABLE users
  ADD COLUMN password_reset_code CHAR(6) NULL AFTER email_verification_last_sent_at,
  ADD COLUMN password_reset_expires_at TIMESTAMP NULL AFTER password_reset_code,
  ADD COLUMN password_reset_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER password_reset_expires_at,
  ADD COLUMN password_reset_last_sent_at TIMESTAMP NULL AFTER password_reset_attempts;

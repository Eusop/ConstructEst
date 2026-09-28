-- Adds the forgot password flow (the Login link had no page or endpoint).
-- Uses its own columns instead of the email_verification_* ones from 012, so
-- the two flows can't overwrite each other's code. The code is stored in plain
-- text for the same reasons as 012.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/014_users_password_reset.sql

USE constructest;

ALTER TABLE users
  ADD COLUMN password_reset_code CHAR(6) NULL AFTER email_verification_last_sent_at,
  ADD COLUMN password_reset_expires_at TIMESTAMP NULL AFTER password_reset_code,
  ADD COLUMN password_reset_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER password_reset_expires_at,
  ADD COLUMN password_reset_last_sent_at TIMESTAMP NULL AFTER password_reset_attempts;

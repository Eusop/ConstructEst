-- Admin "Set temporary password" for users who can't open their email, so
-- Forgot password can't help them. The admin gives the generated password to
-- the user, who must set their own at the next sign in.
--   must_change_password: 1 until the user sets a new password. While it is
--   1, the token only allows /auth/me and /auth/set-new-password.
--   temp_password_expires_at: the temporary password stops working after this
--   (24 hours after the admin sets it).
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/030_temporary_password.sql

USE constructest;

ALTER TABLE users
  ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN temp_password_expires_at DATETIME NULL AFTER must_change_password;

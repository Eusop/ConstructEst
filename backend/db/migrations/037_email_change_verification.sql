-- Changing an email needs a code sent to the new address (IT test TC-U25:
-- an email could be changed to one the user does not own). The new email
-- waits in pending_email until the code is entered. Separate from the
-- email_verification_* and password_reset_* columns so the flows can't
-- overwrite each other's code.
-- Admin-created accounts and admin email edits now leave email_verified_at
-- NULL and send the signup code (TC-A04), so no column change is needed
-- for that. Existing accounts are not touched.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/037_email_change_verification.sql

USE constructest;

ALTER TABLE users
  ADD COLUMN pending_email VARCHAR(255) NULL AFTER email,
  ADD COLUMN email_change_code CHAR(6) NULL AFTER pending_email,
  ADD COLUMN email_change_expires_at TIMESTAMP NULL AFTER email_change_code,
  ADD COLUMN email_change_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER email_change_expires_at,
  ADD COLUMN email_change_last_sent_at TIMESTAMP NULL AFTER email_change_attempts;

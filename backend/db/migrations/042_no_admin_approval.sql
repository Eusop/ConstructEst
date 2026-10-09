-- Accounts no longer wait for an admin to approve them (FR-1 and Form 12:
-- create an account and sign in). Signup still needs the email code. This
-- activates accounts that were only waiting for approval (is_verified = 0).
-- Accounts an admin deactivated have is_verified = 1, so they stay blocked.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/042_no_admin_approval.sql

USE constructest;

UPDATE users SET is_verified = 1, is_active = 1 WHERE is_verified = 0;

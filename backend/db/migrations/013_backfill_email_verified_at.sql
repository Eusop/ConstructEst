-- Fixes a bug in 012_users_email_verification.sql: every row that existed
-- *before* email verification shipped (the seeded admin account included)
-- got email_verified_at = NULL, and login()'s new check has no way to tell
-- "predates this feature" apart from "self-registered and never verified" —
-- it was blocking every existing account, admin included, from logging in
-- at all. Backfills every row that was already active/approved (is_active=1
-- OR is_verified=1) as of right now to email_verified_at = created_at, i.e.
-- "grandfathered in" — only genuinely new, still-pending self-registrations
-- are left NULL, correctly still gated on a real code.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/013_backfill_email_verified_at.sql

USE constructest;

UPDATE users
SET email_verified_at = created_at
WHERE email_verified_at IS NULL
  AND (is_active = 1 OR is_verified = 1);

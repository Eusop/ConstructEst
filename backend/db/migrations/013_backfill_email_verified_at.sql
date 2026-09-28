-- Fixes 012: rows that existed before email verification (including the seeded
-- admin) got email_verified_at = NULL, and login blocked them. This sets
-- email_verified_at = created_at for every row already active or verified, so
-- only new pending registrations still need a real code.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/013_backfill_email_verified_at.sql

USE constructest;

UPDATE users
SET email_verified_at = created_at
WHERE email_verified_at IS NULL
  AND (is_active = 1 OR is_verified = 1);

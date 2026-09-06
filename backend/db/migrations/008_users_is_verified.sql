-- New self-registered accounts must be verified by an admin before they can
-- be activated/used (see auth.controller.js's register + admin.controller.js's
-- verifyUser). Defaulting to 1 means every existing row is auto-verified
-- with zero backfill needed — only `register` explicitly opts a new row out
-- of that default by setting is_verified = 0 at insert time.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/008_users_is_verified.sql

USE constructest;

ALTER TABLE users ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 1 AFTER is_active;

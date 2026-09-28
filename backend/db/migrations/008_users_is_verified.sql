-- New self-registered accounts must be approved by an admin before use (see
-- register in auth.controller.js and verifyUser in admin.controller.js).
-- Default 1 keeps every existing row verified; only register sets it to 0.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/008_users_is_verified.sql

USE constructest;

ALTER TABLE users ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 1 AFTER is_active;

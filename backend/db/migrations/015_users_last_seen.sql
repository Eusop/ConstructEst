-- Adds presence tracking for the Admin Module's "online now" indicator.
-- Distinct from is_active (an admin-controlled deactivation flag) — this is
-- purely "when did this account last prove it was in use", updated on every
-- successful login and on a periodic heartbeat while a session stays open
-- (see src/services/usersService.js's sendHeartbeat, polled from
-- UserContext.jsx). NULL means the account has never logged in at all
-- (e.g. a seeded or admin-created account nobody has signed into yet).
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/015_users_last_seen.sql

USE constructest;

ALTER TABLE users
  ADD COLUMN last_seen_at TIMESTAMP NULL AFTER password_reset_last_sent_at;

-- Adds presence tracking for the admin "online now" dot. Separate from
-- is_active. Updated on login and by the heartbeat (sendHeartbeat in
-- usersService.js, polled from UserContext.jsx). NULL means never logged in.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/015_users_last_seen.sql

USE constructest;

ALTER TABLE users
  ADD COLUMN last_seen_at TIMESTAMP NULL AFTER password_reset_last_sent_at;

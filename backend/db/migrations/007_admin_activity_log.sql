-- Persisted, immutable Admin activity backlog — categorized into
-- User Management and Store Management (see admin.controller.js's
-- logAdminActivity helper, called after every admin mutation succeeds).
-- Deliberately append-only: no UPDATE/DELETE route is ever exposed for this
-- table, and this migration adds none — immutability is structural, not
-- just a missing button in the admin UI.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/007_admin_activity_log.sql

USE constructest;

CREATE TABLE admin_activity_log (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_user_id INT UNSIGNED NOT NULL,
  category ENUM('user_management', 'store_management') NOT NULL,
  action VARCHAR(50) NOT NULL,
  message VARCHAR(500) NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_activity_admin FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

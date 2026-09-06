-- Renames the login-identifier column from user_id to employee_id (clearer
-- name for what it actually is), and drops the unused prc_license column —
-- it only made sense when Engineer/Homeowner were separate roles; RBAC is
-- now just Admin/User, so nothing reads or validates it anymore.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/010_employee_id_rename_and_drop_prc_license.sql

USE constructest;

ALTER TABLE users CHANGE COLUMN user_id employee_id VARCHAR(50) NOT NULL UNIQUE;
ALTER TABLE users DROP COLUMN prc_license;

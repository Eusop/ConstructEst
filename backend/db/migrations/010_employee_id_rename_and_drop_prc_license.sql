-- Renames user_id to employee_id (clearer name) and drops the unused
-- prc_license column, since roles are now just Admin and User.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/010_employee_id_rename_and_drop_prc_license.sql

USE constructest;

ALTER TABLE users CHANGE COLUMN user_id employee_id VARCHAR(50) NOT NULL UNIQUE;
ALTER TABLE users DROP COLUMN prc_license;

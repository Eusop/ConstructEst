-- Adds deactivate/reactivate for stores (like users.is_active). A deactivated
-- store drops out of Store Locator but stays editable in the admin module.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/011_stores_is_active.sql

USE constructest;

ALTER TABLE stores ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER lng;

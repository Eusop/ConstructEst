-- Adds the deactivate/reactivate lifecycle to hardware stores (mirrors
-- users.is_active) — a deactivated store drops out of the Store Locator
-- comparison but stays visible/editable in the Admin Module.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/011_stores_is_active.sql

USE constructest;

ALTER TABLE stores ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER lng;

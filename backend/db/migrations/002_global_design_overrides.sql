-- A project_id IS NULL row in project_design_overrides is the admin's global
-- default (same pattern as estimation_constants). Each field resolves on its
-- own: project override, then this global row, then the engine default (see
-- getEffectiveDesignOverrides in designOverrides.service.js).
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/002_global_design_overrides.sql

USE constructest;

ALTER TABLE project_design_overrides
  MODIFY COLUMN project_id INT UNSIGNED NULL;

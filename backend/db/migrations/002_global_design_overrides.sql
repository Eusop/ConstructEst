-- Allows a project_id IS NULL row in project_design_overrides to represent
-- the admin-managed global default (mirrors estimation_constants' pattern) —
-- every field still resolves per-key: a project's own override wins, else
-- falls back to this global row, else falls back to the engine's own
-- hardcoded default (see designOverrides.service.js's getEffectiveDesignOverrides).
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/002_global_design_overrides.sql

USE constructest;

ALTER TABLE project_design_overrides
  MODIFY COLUMN project_id INT UNSIGNED NULL;

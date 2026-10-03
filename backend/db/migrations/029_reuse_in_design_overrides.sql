-- Formwork and scaffolding reuse become design parameters (engineers,
-- 2026-10-03 meeting: formwork about 3 uses, scaffolding about 4). Both only
-- divide the price; quantities stay the same.
--   formwork_uses: 1 to 3. Blank = 1.
--   scaffolding_uses: blank = 4 (optimization.service.js). Replaces the
--   SCAFFOLDING_REUSE_COUNT server setting, and the admin global row can set it.
-- Project values saved by migration 026 (projects.formwork_uses) are copied
-- over, then that column is dropped.
--
-- Run against the existing live database (after 026):
--   mysql -u root -p constructest < db/migrations/029_reuse_in_design_overrides.sql

USE constructest;

ALTER TABLE project_design_overrides
  ADD COLUMN formwork_uses TINYINT UNSIGNED NULL AFTER beam_stirrup_mm,
  ADD COLUMN scaffolding_uses SMALLINT UNSIGNED NULL AFTER formwork_uses;

INSERT INTO project_design_overrides (project_id, formwork_uses)
SELECT id, formwork_uses FROM projects WHERE formwork_uses > 1
ON DUPLICATE KEY UPDATE formwork_uses = VALUES(formwork_uses);

ALTER TABLE projects DROP COLUMN formwork_uses;

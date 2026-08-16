-- Adds per-project structural design parameter overrides — separate from
-- estimation_constants (which holds the 4 calibration *factors*: cement,
-- steel, roofing, wastage). These are the raw dimensions/counts the paper
-- itself says aren't derivable from a 2D DXF (column/beam/footing sizes,
-- floor-to-floor height, etc.) — see engine/formulas.py's `overrides` dict,
-- which already reads every one of these columns by name, just never had
-- anywhere to be persisted from until now.
--
-- Every column is nullable: NULL means "use the engine's built-in default"
-- (e.g. column height 3.0m for a 1-storey building) — a row only needs to
-- set the columns a user actually chose to override.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/001_project_design_overrides.sql

USE constructest;

CREATE TABLE IF NOT EXISTS project_design_overrides (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  column_width DECIMAL(6, 3) NULL,      -- meters
  column_depth DECIMAL(6, 3) NULL,      -- meters
  column_height DECIMAL(6, 3) NULL,     -- meters
  column_count SMALLINT UNSIGNED NULL,  -- pcs — overrides the DXF-detected count
  beam_width DECIMAL(6, 3) NULL,        -- meters
  beam_depth DECIMAL(6, 3) NULL,        -- meters
  beam_length DECIMAL(10, 2) NULL,      -- meters, total run — no DXF layer provides this at all
  footing_width DECIMAL(6, 3) NULL,     -- meters
  footing_length DECIMAL(6, 3) NULL,    -- meters
  footing_depth DECIMAL(6, 3) NULL,     -- meters
  floor_to_floor_height DECIMAL(6, 3) NULL, -- meters — used by stair computation
  stair_width DECIMAL(6, 3) NULL,       -- meters
  building_height DECIMAL(6, 3) NULL,   -- meters — used by scaffolding computation
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_design_overrides_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY uq_design_overrides_project (project_id)
) ENGINE=InnoDB;

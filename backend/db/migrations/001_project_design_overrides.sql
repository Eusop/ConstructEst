-- Per-project structural parameter overrides, separate from estimation_constants
-- (the 4 calibration factors). These are the dimensions and counts the paper says
-- a 2D DXF can't give (column/beam/footing sizes, floor-to-floor height, etc.).
-- formulas.py already reads each column by name.
--
-- Every column is nullable: NULL means "use the engine's default".
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
  column_count SMALLINT UNSIGNED NULL,  -- pcs, overrides the DXF count
  beam_width DECIMAL(6, 3) NULL,        -- meters
  beam_depth DECIMAL(6, 3) NULL,        -- meters
  beam_length DECIMAL(10, 2) NULL,      -- meters, total run
  footing_width DECIMAL(6, 3) NULL,     -- meters
  footing_length DECIMAL(6, 3) NULL,    -- meters
  footing_depth DECIMAL(6, 3) NULL,     -- meters
  floor_to_floor_height DECIMAL(6, 3) NULL, -- meters, used by stairs
  stair_width DECIMAL(6, 3) NULL,       -- meters
  building_height DECIMAL(6, 3) NULL,   -- meters, used by scaffolding
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_design_overrides_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY uq_design_overrides_project (project_id)
) ENGINE=InnoDB;

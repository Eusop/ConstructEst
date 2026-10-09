-- The engineer's handwritten sheets (2026-10-09) count a ground (footing
-- tie) beam and use 12mm CHB wall bars. Ground beam length is per project
-- (blank: the FTBEAM layer, else none). Wall bar size blank means 10mm.
-- Footing depth already exists (footing_depth); the engine now uses it for
-- the column part below ground, so it needs no change here.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/040_ground_beam_and_wall_bar.sql

USE constructest;

ALTER TABLE project_design_overrides
  ADD COLUMN ground_beam_length DECIMAL(10,2) NULL AFTER beam_length,
  ADD COLUMN wall_bar_mm SMALLINT UNSIGNED NULL AFTER angle_bar_kg_per_m;

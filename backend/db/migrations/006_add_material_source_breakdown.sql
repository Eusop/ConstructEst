-- Adds per-source breakdown to estimation results: which floor (or
-- "roofing"/"shared" for columns and footings) each quantity came from (see
-- SOURCE_CATEGORIES in formulas.py), plus per-floor wall length and floor area
-- for projects with two DXF files. All columns are nullable, so older
-- projects are unchanged.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/006_add_material_source_breakdown.sql

USE constructest;

ALTER TABLE estimation_results
  ADD COLUMN ground_wall_length DECIMAL(10, 2) NULL AFTER rooms_detected,
  ADD COLUMN ground_floor_area DECIMAL(10, 2) NULL AFTER ground_wall_length,
  ADD COLUMN second_wall_length DECIMAL(10, 2) NULL AFTER ground_floor_area,
  ADD COLUMN second_floor_area DECIMAL(10, 2) NULL AFTER second_wall_length;

ALTER TABLE estimation_line_items
  ADD COLUMN source_breakdown JSON NULL AFTER basis;

-- Saves geometry the engine already computed (door/window area, floor
-- perimeter, column count, roof perimeter and ridge length) so it reaches the
-- API response and the "Detailed extraction information" section on Results.
-- All columns are nullable; older estimations get them after a Recalculate.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/009_add_detailed_extraction_measurements.sql

USE constructest;

ALTER TABLE estimation_results
  ADD COLUMN door_area DECIMAL(10, 2) NULL AFTER rooms_detected,
  ADD COLUMN window_area DECIMAL(10, 2) NULL AFTER door_area,
  ADD COLUMN column_count SMALLINT UNSIGNED NULL AFTER window_area,
  ADD COLUMN floor_perimeter DECIMAL(10, 2) NULL AFTER column_count,
  ADD COLUMN roof_perimeter DECIMAL(10, 2) NULL AFTER floor_perimeter,
  ADD COLUMN roof_ridge_length DECIMAL(10, 2) NULL AFTER roof_perimeter;

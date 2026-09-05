-- Surfaces geometry that the DXF engine already computes (door/window
-- opening area, the floor outline's own perimeter, detected column count,
-- roof perimeter, roof ridge length) but previously discarded before it
-- ever reached the API response — see engine/formulas.py's `measurements`
-- dict and the "Detailed extraction information" section on the Results
-- page. All columns nullable: an existing estimation row simply has none of
-- this until it's recomputed (Recalculate re-runs persistEstimation, which
-- will fill these in going forward).
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

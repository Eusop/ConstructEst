-- Adds per-source categorization to estimation results: which floor (or
-- "roofing"/"shared" for whole-building elements like columns/footings)
-- each material's quantity actually came from (see engine/formulas.py's
-- SOURCE_CATEGORIES / MaterialAccumulator.by_category), plus the per-floor
-- wall length/floor area breakdown for 2-storey projects uploaded with a
-- separate ground-floor and second-floor DXF. All columns are nullable —
-- a project computed before this change, or one that only ever used a
-- single DXF, simply leaves them NULL; nothing existing changes shape.
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

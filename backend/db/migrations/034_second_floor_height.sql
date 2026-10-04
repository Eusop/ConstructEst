-- Separate second floor height (the engineer, 2026-10-04: e.g. 5 m ground
-- floor, 4 m second floor). floor_to_floor_height stays the ground floor
-- height. NULL uses the ground floor height, so old projects compute the same.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/034_second_floor_height.sql

USE constructest;

ALTER TABLE project_design_overrides
  ADD COLUMN second_floor_height DECIMAL(6,3) NULL AFTER floor_to_floor_height;

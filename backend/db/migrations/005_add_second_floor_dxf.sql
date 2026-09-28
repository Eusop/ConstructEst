-- Optional second floor DXF: a 2-storey project can upload a separate file
-- instead of scaling the ground floor by storeys (see geometry2 in
-- formulas.py). Both columns are nullable, so older and single-file projects
-- are unchanged.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/005_add_second_floor_dxf.sql

USE constructest;

ALTER TABLE projects
  ADD COLUMN second_floor_dxf_path VARCHAR(500) NULL AFTER dxf_original_name,
  ADD COLUMN second_floor_dxf_original_name VARCHAR(255) NULL AFTER second_floor_dxf_path;

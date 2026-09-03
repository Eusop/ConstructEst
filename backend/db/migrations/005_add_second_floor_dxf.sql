-- Adds optional second-floor-DXF support: a 2-storey project may now upload
-- a separate DXF for the second floor instead of the engine reusing the
-- ground floor's footprint scaled by storeys (see engine/formulas.py's
-- geometry2 parameter). Both columns are nullable — a project created
-- before this change, or one where the user only ever uploads one file
-- (still fully supported, unchanged behavior), simply leaves them NULL.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/005_add_second_floor_dxf.sql

USE constructest;

ALTER TABLE projects
  ADD COLUMN second_floor_dxf_path VARCHAR(500) NULL AFTER dxf_original_name,
  ADD COLUMN second_floor_dxf_original_name VARCHAR(255) NULL AFTER second_floor_dxf_path;

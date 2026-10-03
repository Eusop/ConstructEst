-- Footing thickness: the concrete pad's own thickness, used for footing
-- concrete, footing rebar (kg per m3) and the new footing side forms. Footing
-- depth stays as the depth below ground (column bar length). Nullable: blank
-- uses the engine default of 0.30 m (formulas.py DEFAULT_FOOTING_THICKNESS_M).
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/028_footing_thickness.sql

USE constructest;

ALTER TABLE project_design_overrides
  ADD COLUMN footing_thickness DECIMAL(6,3) NULL AFTER footing_depth;

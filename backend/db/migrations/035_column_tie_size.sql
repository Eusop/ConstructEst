-- Lateral ties size for columns (the engineer, 2026-10-05). Column and beam
-- rebar are now always by weight per m3; the main bar and tie sizes only
-- split each half into lengths. NULL uses 10mm.
-- The old bar count, tie spacing, beam main bar length and stirrup spacing
-- columns stay, but the engine no longer reads them.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/035_column_tie_size.sql

USE constructest;

ALTER TABLE project_design_overrides
  ADD COLUMN column_tie_mm SMALLINT UNSIGNED NULL AFTER column_bar_mm;

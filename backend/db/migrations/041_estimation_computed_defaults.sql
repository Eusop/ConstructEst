-- What the engine used for each blank Design parameter (column count, beam
-- length, ground beam, building height, scaffold sets, ...), so the page can
-- show those numbers instead of "Auto". Null for estimates saved before this;
-- Recalculate fills it in.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/041_estimation_computed_defaults.sql

USE constructest;

ALTER TABLE estimation_results
  ADD COLUMN computed_defaults JSON NULL AFTER estimated_cost;

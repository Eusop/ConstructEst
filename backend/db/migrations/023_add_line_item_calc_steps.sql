-- Saves the engine's step-by-step computation for each material, shown as
-- "Show computation" on the Material Estimation page. Nullable: older
-- estimations have no steps until they are recalculated.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/023_add_line_item_calc_steps.sql

USE constructest;

ALTER TABLE estimation_line_items
  ADD COLUMN calc_steps JSON NULL AFTER source_breakdown;

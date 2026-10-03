-- Design parameters the engineers asked to enter from the plan (2026-10-03
-- meeting): footing count and rebar rate, slab bar size and spacing, column
-- bar count, bar size and tie spacing, and beam stirrup spacing and size.
-- All nullable: blank keeps the engine's default (formulas.py), so existing
-- projects compute the same as before.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/027_rebar_design_overrides.sql

USE constructest;

ALTER TABLE project_design_overrides
  ADD COLUMN footing_count SMALLINT UNSIGNED NULL AFTER beam_rebar_diameter_mm,
  ADD COLUMN footing_rebar_kg_per_m3 DECIMAL(6,1) NULL AFTER footing_count,
  ADD COLUMN ground_slab_bar_mm SMALLINT UNSIGNED NULL AFTER footing_rebar_kg_per_m3,
  ADD COLUMN ground_slab_bar_spacing DECIMAL(5,3) NULL AFTER ground_slab_bar_mm,
  ADD COLUMN second_slab_bar_mm SMALLINT UNSIGNED NULL AFTER ground_slab_bar_spacing,
  ADD COLUMN second_slab_bar_spacing DECIMAL(5,3) NULL AFTER second_slab_bar_mm,
  ADD COLUMN column_bar_count SMALLINT UNSIGNED NULL AFTER second_slab_bar_spacing,
  ADD COLUMN column_bar_mm SMALLINT UNSIGNED NULL AFTER column_bar_count,
  ADD COLUMN column_tie_spacing DECIMAL(5,3) NULL AFTER column_bar_mm,
  ADD COLUMN beam_stirrup_spacing DECIMAL(5,3) NULL AFTER column_tie_spacing,
  ADD COLUMN beam_stirrup_mm SMALLINT UNSIGNED NULL AFTER beam_stirrup_spacing;

-- The engineer's handwritten sheet and truss formula (2026-10-04): column and
-- beam rebar by weight per m3 of concrete, and truss angle bar by framing
-- weight per m2 of roof. All nullable: blank uses the defaults in
-- formulas.py (180 and 160 kg per m3, 17.5 kg per m2, 3.4 kg per m).
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/031_rebar_ratio_and_truss.sql

USE constructest;

ALTER TABLE project_design_overrides
  ADD COLUMN column_rebar_kg_per_m3 DECIMAL(6,1) NULL AFTER column_tie_spacing,
  ADD COLUMN beam_rebar_kg_per_m3 DECIMAL(6,1) NULL AFTER column_rebar_kg_per_m3,
  ADD COLUMN truss_framing_kg_per_m2 DECIMAL(6,2) NULL AFTER scaffolding_uses,
  ADD COLUMN angle_bar_kg_per_m DECIMAL(6,3) NULL AFTER truss_framing_kg_per_m2;

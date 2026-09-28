USE constructest;
ALTER TABLE project_design_overrides
  ADD COLUMN beam_rebar_length DECIMAL(10, 2) NULL AFTER column_depth_second,
  ADD COLUMN beam_rebar_diameter_mm SMALLINT UNSIGNED NULL AFTER beam_rebar_length;

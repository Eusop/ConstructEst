USE constructest;
ALTER TABLE project_design_overrides
  ADD COLUMN scaffolding_set_count SMALLINT UNSIGNED NULL AFTER stair_rebar_spacing;

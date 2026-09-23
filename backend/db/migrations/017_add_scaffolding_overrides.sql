USE constructest;
ALTER TABLE project_design_overrides
  ADD COLUMN scaffolding_set_width DECIMAL(6, 3) NULL AFTER building_height,
  ADD COLUMN scaffolding_set_height DECIMAL(6, 3) NULL AFTER scaffolding_set_width;

USE constructest;
ALTER TABLE project_design_overrides
  ADD COLUMN column_width_second DECIMAL(6, 3) NULL AFTER scaffolding_set_count,
  ADD COLUMN column_depth_second DECIMAL(6, 3) NULL AFTER column_width_second;

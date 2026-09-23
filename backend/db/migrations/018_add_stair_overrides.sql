USE constructest;
ALTER TABLE project_design_overrides
  ADD COLUMN riser_height DECIMAL(6, 3) NULL AFTER scaffolding_set_height,
  ADD COLUMN tread_depth DECIMAL(6, 3) NULL AFTER riser_height,
  ADD COLUMN waist_thickness DECIMAL(6, 3) NULL AFTER tread_depth,
  ADD COLUMN stair_rebar_spacing DECIMAL(6, 3) NULL AFTER waist_thickness;

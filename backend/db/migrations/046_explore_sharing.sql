-- Explore Projects (panel recommendation, Nov 3 2026 defense): users can
-- share a finished project so others can browse what a house of that size
-- costs. Sharing is off by default (opt-in). The floor plan is only shown
-- when the owner also turns on share_floor_plan. floor_plan_preview caches
-- the drawing's lines and shapes (no text) so the DXF is never sent out.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/046_explore_sharing.sql

USE constructest;

ALTER TABLE projects
  ADD COLUMN share_in_explore TINYINT(1) NOT NULL DEFAULT 0 AFTER selected_store_id,
  ADD COLUMN share_floor_plan TINYINT(1) NOT NULL DEFAULT 0 AFTER share_in_explore,
  ADD COLUMN shared_at TIMESTAMP NULL AFTER share_floor_plan,
  ADD COLUMN floor_plan_preview JSON NULL AFTER shared_at;

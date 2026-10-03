-- From the 2026-10-03 meeting with the engineers:
--   1. bar_pieces: rebar length per bar size and the number of 6 m bars,
--      so the Bill of Materials can list rebar the way stores sell it.
--      Nullable: older estimations have none until they are recalculated.
--   2. formwork_uses: how many times the formwork is used (1 to 3). The
--      plywood and lumber price is divided by it, like scaffolding. The
--      quantity stays the same.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/026_bar_pieces_and_formwork_uses.sql

USE constructest;

ALTER TABLE estimation_line_items
  ADD COLUMN bar_pieces JSON NULL AFTER calc_steps;

ALTER TABLE projects
  ADD COLUMN formwork_uses TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER selected_store_id;

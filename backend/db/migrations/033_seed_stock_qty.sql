-- Assumed stock on hand for testing, not canvassed. Enough for about 30 times
-- the accuracy test house (2 storeys, roofing on: 2,536 CHB, 456 cement,
-- 3.34 t rebar, 1,466 bd.ft. lumber), rounded up, so test projects do not show
-- "Store has only ..." on the Bill of Materials. Stock is not used up by
-- estimates; it only flags a project bigger than the count.
-- Same unit the BOM compares with: the price unit, except roofing sheets,
-- which the BOM lists as sheets. Lumber is in bd.ft. (the BOM converts it to
-- pieces). Only fills counts that are still blank, so admin-entered counts stay.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/033_seed_stock_qty.sql

USE constructest;

UPDATE store_material_prices smp
JOIN material_brands mb ON mb.id = smp.material_brand_id
JOIN (
  SELECT 'hollowBlocks' AS material_key, 80000 AS qty UNION ALL
  SELECT 'cement', 14000 UNION ALL
  SELECT 'sand', 900 UNION ALL
  SELECT 'gravel', 800 UNION ALL
  SELECT 'steelRebar', 105 UNION ALL
  SELECT 'tieWire', 2500 UNION ALL
  SELECT 'roofingSheets', 1200 UNION ALL
  SELECT 'purlins', 850 UNION ALL
  SELECT 'ridge', 150 UNION ALL
  SELECT 'flashing', 520 UNION ALL
  SELECT 'angleBar', 1550 UNION ALL
  SELECT 'gutter', 500 UNION ALL
  SELECT 'plywood', 2600 UNION ALL
  SELECT 'lumber', 44000 UNION ALL
  SELECT 'steelProps', 3200 UNION ALL
  SELECT 'scaffolding', 3200
) seed ON seed.material_key = mb.material_key
SET smp.stock_qty = seed.qty
WHERE smp.stock_qty IS NULL;

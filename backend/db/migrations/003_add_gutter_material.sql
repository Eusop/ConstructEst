-- Adds the Gutter material from the capstone paper's Table 16 ("Roof Eave
-- Length / standard gutter length (1.8m per pc)"), which was completely
-- missing from the original build despite having an explicit formula in
-- the paper — every other roofing accessory (roofing sheets, purlins,
-- ridge, flashing/capping) was implemented, this one was overlooked.
--
-- Mirrors the existing roofing-accessory brands (MetroTile/DN Steel/Clark
-- Steel) and the per-store price multiplier pattern already used in seed.sql.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/003_add_gutter_material.sql

USE constructest;

INSERT INTO material_brands (material_key, material_name, unit, brand, spec, base_price, quality, category, is_commodity) VALUES
('gutter', 'Gutter', 'pcs', 'MetroTile', 'GI gutter, 1.8m length', 320, 3, 'Roofing', 0),
('gutter', 'Gutter', 'pcs', 'DN Steel', 'GI gutter, 1.8m length', 380, 4, 'Roofing', 0),
('gutter', 'Gutter', 'pcs', 'Clark Steel', 'GI gutter, 1.8m length', 440, 5, 'Roofing', 0);

-- Same per-store multiplier pattern as seed.sql's original material_brands
-- rollout (1.000 / 1.015 / 1.024 / 1.000) — gutter has no availability
-- exception at any store (unlike steelRebar at store 4).
INSERT INTO store_material_prices (store_id, material_brand_id, price, in_stock)
SELECT s.id, mb.id, ROUND(mb.base_price * s.multiplier, 2), 1
FROM material_brands mb
JOIN (
  SELECT 1 AS id, 1.000 AS multiplier UNION ALL
  SELECT 2, 1.015 UNION ALL
  SELECT 3, 1.024 UNION ALL
  SELECT 4, 1.000
) s ON 1 = 1
WHERE mb.material_key = 'gutter';

-- Gutter, flashing and ridge were priced per 1.8m piece (Table 16, migration
-- 022). formulas.py now counts Fajardo's effective lengths (Simplified
-- Construction Estimate, Table 6-6): gutter 2.35m, flashing 2.30m, ridge roll
-- 2.20m. Each piece is longer, so its price is scaled by new length / 1.8.
-- Like 022, this is a pro-rated assumption, not a canvassed price.
--
-- Only rows that still say '1.8m length' change, so running it twice is safe.
-- Store prices are updated first, while the spec still matches.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/025_roof_accessory_fajardo_lengths.sql

USE constructest;

UPDATE store_material_prices smp
JOIN material_brands mb ON mb.id = smp.material_brand_id
SET smp.price = ROUND(smp.price * CASE mb.material_key
    WHEN 'gutter' THEN 2.35 / 1.8
    WHEN 'flashing' THEN 2.30 / 1.8
    WHEN 'ridge' THEN 2.20 / 1.8
  END, 2)
WHERE mb.material_key IN ('gutter', 'flashing', 'ridge') AND mb.spec LIKE '%1.8m length';

UPDATE material_brands
SET base_price = ROUND(base_price * CASE material_key
    WHEN 'gutter' THEN 2.35 / 1.8
    WHEN 'flashing' THEN 2.30 / 1.8
    WHEN 'ridge' THEN 2.20 / 1.8
  END, 2),
  spec = REPLACE(spec, '1.8m length', CASE material_key
    WHEN 'gutter' THEN '2.35m length'
    WHEN 'flashing' THEN '2.30m length'
    WHEN 'ridge' THEN '2.20m length'
  END)
WHERE material_key IN ('gutter', 'flashing', 'ridge') AND spec LIKE '%1.8m length';

SELECT material_key, brand, spec, base_price FROM material_brands
WHERE material_key IN ('gutter', 'flashing', 'ridge') ORDER BY material_key, base_price;

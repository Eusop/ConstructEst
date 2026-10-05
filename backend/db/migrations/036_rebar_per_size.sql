-- Rebar priced per piece by size (6 m bars), because stores sell it by the
-- piece and sizes cost differently per kg. New materials rebar10mm,
-- rebar12mm and rebar16mm, one row per existing rebar brand.
--
-- Prices are provisional, not a Tarlac canvass: ₱175 (10mm), ₱218 (12mm)
-- and ₱355 (16mm) per 6 m bar, from a published 2026 Philippine price
-- reference (aedoconstruction.com, Aug 2026). They are set for the cheapest
-- brand at ₱54,500 per ton, and every other brand and store keeps the same
-- ratio as its per-ton price. Replace them with quotations in Admin.
-- Stock counts are assumed test values, about 30 test houses.
--
-- The old per-ton rebar rows stay for estimates saved without bar counts.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/036_rebar_per_size.sql

USE constructest;

INSERT INTO material_brands (material_key, material_name, unit, brand, spec, base_price, quality, category, is_commodity)
SELECT CONCAT('rebar', s.mm, 'mm'), CONCAT('Rebar ', s.mm, 'mm'), 'pcs', mb.brand,
       CONCAT(COALESCE(mb.spec, 'Grade 40'), ', ', s.mm, 'mm x 6 m'),
       ROUND(s.ref_price * mb.base_price / 54500, 2), mb.quality, mb.category, 0
FROM material_brands mb
JOIN (SELECT 10 AS mm, 175 AS ref_price UNION ALL SELECT 12, 218 UNION ALL SELECT 16, 355) s
WHERE mb.material_key = 'steelRebar'
  AND NOT EXISTS (
    SELECT 1 FROM material_brands x
    WHERE x.material_key = CONCAT('rebar', s.mm, 'mm') AND x.brand = mb.brand
  );

INSERT INTO store_material_prices (store_id, material_brand_id, price, in_stock, stock_qty)
SELECT smp.store_id, nb.id, ROUND(s.ref_price * smp.price / 54500, 2), smp.in_stock, s.stock
FROM store_material_prices smp
JOIN material_brands ob ON ob.id = smp.material_brand_id AND ob.material_key = 'steelRebar'
JOIN (
  SELECT 10 AS mm, 175 AS ref_price, 14000 AS stock UNION ALL
  SELECT 12, 218, 4100 UNION ALL
  SELECT 16, 355, 3100
) s
JOIN material_brands nb ON nb.material_key = CONCAT('rebar', s.mm, 'mm') AND nb.brand = ob.brand
WHERE NOT EXISTS (
  SELECT 1 FROM store_material_prices y WHERE y.store_id = smp.store_id AND y.material_brand_id = nb.id
);

-- Makes the old rows easy to tell apart in Admin.
UPDATE material_brands SET material_name = 'Rebar (per ton, old estimates)' WHERE material_key = 'steelRebar';

-- Flashing was seeded priced per linear meter ('m'), but the capstone
-- paper's Table 16 states flashing's unit as "pcs" (roof perimeter /
-- 1.8m standard piece length) — which is what the engine actually
-- computes (a piece count) and what formulas.py's own material_meta
-- already declares. Multiplying a piece count by a per-meter price
-- undercharged flashing by ~45%.
--
-- Scales each brand's base_price (and its already-seeded per-store
-- prices) by 1.8 to convert "price per linear meter" into "price per
-- 1.8m piece", preserving whatever per-store multiplier was already
-- baked into each store's price.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/004_fix_flashing_unit.sql

USE constructest;

UPDATE store_material_prices smp
JOIN material_brands mb ON mb.id = smp.material_brand_id
SET smp.price = ROUND(smp.price * 1.8, 2)
WHERE mb.material_key = 'flashing';

UPDATE material_brands
SET unit = 'pcs', spec = 'GI flashing, 1.8m length', base_price = ROUND(base_price * 1.8, 2)
WHERE material_key = 'flashing';

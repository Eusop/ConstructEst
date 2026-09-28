-- Flashing was priced per linear meter ('m'), but the paper's Table 16 counts it
-- in 'pcs' (roof perimeter / 1.8m piece), which is what the engine computes.
-- A piece count times a per-meter price undercharged flashing by about 45%.
--
-- Scales each brand's base_price and its per-store prices by 1.8, to get
-- "price per 1.8m piece" while keeping each store's multiplier.
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

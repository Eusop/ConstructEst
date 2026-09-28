-- Lumber was priced per piece (a 2"x2"x10ft stick, unit 'pcs'), but Table 19
-- gives lumber in 'bd.ft.', which is what the engine computes. Pricing a stick
-- per board foot overcharged lumber by about 3.3x (a stick is 3.333 bd.ft.).
-- Same bug as 004.
--
-- Scales each brand's base_price and per-store prices by 0.3 (1 / 3.333) to get
-- "price per board foot" while keeping each store's multiplier.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/016_fix_lumber_unit.sql

USE constructest;

UPDATE store_material_prices smp
JOIN material_brands mb ON mb.id = smp.material_brand_id
SET smp.price = ROUND(smp.price * 0.3, 2)
WHERE mb.material_key = 'lumber';

UPDATE material_brands
SET unit = 'bd.ft.', base_price = ROUND(base_price * 0.3, 2)
WHERE material_key = 'lumber';

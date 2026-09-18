-- Lumber was seeded priced per piece (a whole 2"x2"x10ft stick, unit
-- 'pcs'), but the capstone paper's Table 19 states lumber's unit as
-- "bd.ft." (Total Formwork Area x 3 board feet per m2) — which is what
-- the engine actually computes (formulas.py's material_meta already
-- declares "bd.ft.") and what optimization.service.js's computeBom prices
-- directly with no unit conversion. Charging a whole-stick price per
-- board-foot overcharged Lumber by ~3.3x (a 2"x2"x10ft stick is 3.333
-- board-feet). Same bug shape as 004_fix_flashing_unit.sql.
--
-- Scales each brand's base_price (and its already-seeded per-store
-- prices) by 0.3 (= 1 / 3.333) to convert "price per stick" into "price
-- per board-foot", preserving whatever per-store multiplier was already
-- baked into each store's price.
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

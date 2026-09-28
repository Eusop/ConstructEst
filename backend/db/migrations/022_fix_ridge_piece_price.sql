-- Ridge was priced per 6m roll ('Ridge roll, 6m'), but Table 16 counts ridge in
-- 1.8m pieces, which is what formulas.py computes. That overcharged ridge by
-- about 3.3x.
--
-- Same fix as 004: scales base_price and per-store prices by 1.8 / 6 = 0.3 to
-- get the price of one 1.8m piece. This is a pro-rated assumption, not a
-- canvassed price. Replace it once a canvass gives the real length and price.
--
-- Only rows that still say 'Ridge roll, 6m' change, so running it twice is safe.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/022_fix_ridge_piece_price.sql

USE constructest;

UPDATE store_material_prices smp
JOIN material_brands mb ON mb.id = smp.material_brand_id
SET smp.price = ROUND(smp.price * 0.3, 2)
WHERE mb.material_key = 'ridge' AND mb.spec = 'Ridge roll, 6m';

UPDATE material_brands
SET spec = 'Ridge roll, 1.8m length', base_price = ROUND(base_price * 0.3, 2)
WHERE material_key = 'ridge' AND spec = 'Ridge roll, 6m';

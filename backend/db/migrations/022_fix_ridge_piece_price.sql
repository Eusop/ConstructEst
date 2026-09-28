-- Ridge was seeded priced per 6m roll ('Ridge roll, 6m'), but the
-- capstone paper's Table 16 counts ridge in 1.8m pieces (ridge length /
-- 1.8m per pc), which is what formulas.py computes. Multiplying a 1.8m
-- piece count by a 6m roll price overcharged ridge by about 3.3x.
--
-- Same fix as 004 for flashing: scale each brand's base_price and its
-- already-seeded per-store prices by 1.8 / 6 = 0.3, so the price is for
-- one 1.8m piece. This is a pro-rated ASSUMPTION, not a canvassed price;
-- replace it once a hardware canvass gives the real ridge piece length
-- and price.
--
-- Guarded on the old spec text, so running this twice does nothing the
-- second time.
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

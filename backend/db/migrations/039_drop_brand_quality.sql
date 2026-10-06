-- Brand Selection tiers go by price only (2026-10-06). The paper keeps
-- material quality out of scope (p. 25) and Table 20 picks brands by price,
-- so the 1-5 quality rating is no longer used. Premium is now the
-- highest-priced brand.
--
-- Run this AFTER the new backend is deployed. The old backend still reads
-- this column, so dropping it first breaks Brand Selection until the deploy.
--   mysql -u root -p constructest < db/migrations/039_drop_brand_quality.sql

USE constructest;

ALTER TABLE material_brands DROP COLUMN quality;

-- Stock count per store and brand (the engineer asked to show how much a
-- store has). In the same unit the price is per (bags, pcs, tons, bd.ft.).
-- NULL means the count is not known, and the BOM shows no stock line.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/032_store_stock_qty.sql

USE constructest;

ALTER TABLE store_material_prices
  ADD COLUMN stock_qty DECIMAL(12,2) NULL AFTER in_stock;

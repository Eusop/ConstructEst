-- ConstructEst seed data. Mirrors the frontend mock data (brandOptionsMock.js,
-- storesMock.js, storePricing.js, calibrationDefaults.js) so real API calls give
-- the same numbers the mocks showed.
--
-- Run after schema.sql:
--   mysql -u root -p constructest < seed.sql

USE constructest;

-- ---------------------------------------------------------------------------
-- Admin account. Password is "ChangeMe123!" (hash from `npm run hash-password`).
-- There is no admin signup, so this is the only way in. Change the password
-- with PUT /api/users/me/password after logging in.
-- ---------------------------------------------------------------------------
-- email_verified_at is set here (not NULL). That column only tracks whether a
-- self-registered user proved their email, so a seeded admin should not be
-- blocked by the login check (same fix as migration 013 for existing databases).
-- The admin takes User ID 20260001, so the 2026 counter starts at 1.
INSERT INTO users (first_name, last_name, user_id, email, password_hash, access_role, email_verified_at)
VALUES ('System', 'Admin', '20260001', 'admin@constructest.local',
        '$2a$10$tsAJhcupRMJt1XVsmBIiQe1M4qMcXQ6JaBs6JUcnEQRJjdpWZcUqq', 'admin', NOW());
INSERT INTO user_id_counters (id_year, last_seq) VALUES (2026, 1);

-- ---------------------------------------------------------------------------
-- Material catalog: 14 brand-selectable materials x 3 brands, plus sand and
-- gravel priced flat with no brand choice (see brandOptionsMock.js).
-- ---------------------------------------------------------------------------
INSERT INTO material_brands (material_key, material_name, unit, brand, spec, base_price, category, is_commodity) VALUES
('hollowBlocks', 'CHB (Concrete Hollow Blocks)', 'pcs', 'JBC', '4" CHB', 12, 'Masonry', 0),
('hollowBlocks', 'CHB (Concrete Hollow Blocks)', 'pcs', 'Eagle Blocks', '4" CHB', 10, 'Masonry', 0),
('hollowBlocks', 'CHB (Concrete Hollow Blocks)', 'pcs', 'Eversafe', '4" CHB', 14, 'Masonry', 0),

('cement', 'Cement', 'bags', 'Republic', '40kg', 255, 'Cementitious', 0),
('cement', 'Cement', 'bags', 'Holcim', '40kg', 268, 'Cementitious', 0),
('cement', 'Cement', 'bags', 'Eagle', '40kg', 239, 'Cementitious', 0),

('sand', 'Sand', 'm3', 'Local', NULL, 1300, 'Aggregate', 1),
('gravel', 'Gravel', 'm3', 'Local', NULL, 1250, 'Aggregate', 1),

('steelRebar', 'Rebar', 'tons', 'SteelAsia', 'Grade 40', 58000, 'Reinforcement', 0),
('steelRebar', 'Rebar', 'tons', 'Capitol Steel', 'Grade 40', 54500, 'Reinforcement', 0),
('steelRebar', 'Rebar', 'tons', 'Pag-asa Steel', 'Grade 40', 61200, 'Reinforcement', 0),

('tieWire', 'Tie Wire', 'kg', 'Local GI', '#16 gauge', 85, 'Reinforcement', 0),
('tieWire', 'Tie Wire', 'kg', 'Firmex', '#16 gauge', 90, 'Reinforcement', 0),
('tieWire', 'Tie Wire', 'kg', 'GalvSteel', '#16 gauge', 105, 'Reinforcement', 0),

('roofingSheets', 'Roofing', 'm2', 'DN Steel', '0.4mm', 520, 'Roofing', 0),
('roofingSheets', 'Roofing', 'm2', 'Clark Steel', '0.5mm', 585, 'Roofing', 0),
('roofingSheets', 'Roofing', 'm2', 'MetroTile', '0.35mm', 470, 'Roofing', 0),

('purlins', 'Purlins', 'lengths', 'MetroTile', '2"x3" C-purlin, 6m', 750, 'Roofing', 0),
('purlins', 'Purlins', 'lengths', 'DN Steel', '2"x3" C-purlin, 6m', 850, 'Roofing', 0),
('purlins', 'Purlins', 'lengths', 'Clark Steel', '2"x3" C-purlin, 6m', 980, 'Roofing', 0),

('ridge', 'Ridge', 'lengths', 'MetroTile', 'Ridge roll, 2.20m length', 143, 'Roofing', 0),
('ridge', 'Ridge', 'lengths', 'DN Steel', 'Ridge roll, 2.20m length', 165, 'Roofing', 0),
('ridge', 'Ridge', 'lengths', 'Clark Steel', 'Ridge roll, 2.20m length', 190.67, 'Roofing', 0),

('flashing', 'Flashing', 'pcs', 'MetroTile', 'GI flashing, 2.30m length', 345, 'Roofing', 0),
('flashing', 'Flashing', 'pcs', 'DN Steel', 'GI flashing, 2.30m length', 414, 'Roofing', 0),
('flashing', 'Flashing', 'pcs', 'Clark Steel', 'GI flashing, 2.30m length', 483, 'Roofing', 0),

('angleBar', 'Angle Bar', 'lengths', 'Capitol Steel', '1/4"x1.5"x1.5", 6m', 560, 'Roofing', 0),
('angleBar', 'Angle Bar', 'lengths', 'SteelAsia', '1/4"x1.5"x1.5", 6m', 620, 'Roofing', 0),
('angleBar', 'Angle Bar', 'lengths', 'Pag-asa Steel', '1/4"x1.5"x1.5", 6m', 680, 'Roofing', 0),

('gutter', 'Gutter', 'pcs', 'MetroTile', 'GI gutter, 2.35m length', 417.78, 'Roofing', 0),
('gutter', 'Gutter', 'pcs', 'DN Steel', 'GI gutter, 2.35m length', 496.11, 'Roofing', 0),
('gutter', 'Gutter', 'pcs', 'Clark Steel', 'GI gutter, 2.35m length', 574.44, 'Roofing', 0),

('plywood', 'Plywood', 'pcs', 'Generic Marine', '1/2" 4x8ft', 680, 'Formwork', 0),
('plywood', 'Plywood', 'pcs', 'Federation', '1/2" 4x8ft', 780, 'Formwork', 0),
('plywood', 'Plywood', 'pcs', 'Basilisa', '1/2" 4x8ft marine', 920, 'Formwork', 0),

('lumber', 'Lumber', 'bd.ft.', 'Local Coco Lumber', '2"x2"x10ft', 24, 'Formwork', 0),
('lumber', 'Lumber', 'bd.ft.', 'Goodwood', '2"x2"x10ft', 28.5, 'Formwork', 0),
('lumber', 'Lumber', 'bd.ft.', 'Primewood', '2"x2"x10ft', 34.5, 'Formwork', 0),

('steelProps', 'Steel Props', 'pcs', 'Generic Steel Props', 'Adjustable, 3m', 1250, 'Formwork', 0),
('steelProps', 'Steel Props', 'pcs', 'FormWorks PH', 'Adjustable, 3m', 1450, 'Formwork', 0),
('steelProps', 'Steel Props', 'pcs', 'Doka', 'Adjustable, 3m', 1750, 'Formwork', 0),

('scaffolding', 'Scaffolding', 'sets', 'Generic Scaffold', 'H-frame set', 2800, 'Formwork', 0),
('scaffolding', 'Scaffolding', 'sets', 'Bosco Scaffolding', 'H-frame set', 3200, 'Formwork', 0),
('scaffolding', 'Scaffolding', 'sets', 'Layher', 'H-frame set', 3900, 'Formwork', 0);

-- ---------------------------------------------------------------------------
-- Stores. Matches storesMock.js (Tarlac City).
-- ---------------------------------------------------------------------------
INSERT INTO stores (id, name, address, lat, lng) VALUES
(1, 'Tarlac Builders Depot', 'MacArthur Hwy, San Roque, Tarlac City', 15.480200, 120.597900),
(2, 'JRS Hardware Supply', 'Romulo Blvd, San Sebastian, Tarlac City', 15.485000, 120.605000),
(3, 'Northgate Home Center', 'Circumferential Rd, Tarlac City', 15.465000, 120.590000),
(4, 'Villaflor Hardware', 'San Miguel, Tarlac City', 15.490000, 120.580000);

-- Per-store price multiplier on every brand's base_price (STORE_PRICE_MULTIPLIERS
-- in storePricing.js). Villaflor Hardware (store 4) gets no steelRebar rows, to
-- test the Store Locator's unavailability notice (FR-11).
INSERT INTO store_material_prices (store_id, material_brand_id, price, in_stock)
SELECT s.id, mb.id, ROUND(mb.base_price * s.multiplier, 2), 1
FROM material_brands mb
JOIN (
  SELECT 1 AS id, 1.000 AS multiplier UNION ALL
  SELECT 2, 1.015 UNION ALL
  SELECT 3, 1.024 UNION ALL
  SELECT 4, 1.000
) s ON 1 = 1
WHERE NOT (s.id = 4 AND mb.material_key = 'steelRebar');

-- Assumed stock on hand, about 30 times the accuracy test house, not
-- canvassed (see migrations/033_seed_stock_qty.sql).
UPDATE store_material_prices smp
JOIN material_brands mb ON mb.id = smp.material_brand_id
JOIN (
  SELECT 'hollowBlocks' AS material_key, 80000 AS qty UNION ALL
  SELECT 'cement', 14000 UNION ALL
  SELECT 'sand', 900 UNION ALL
  SELECT 'gravel', 800 UNION ALL
  SELECT 'steelRebar', 105 UNION ALL
  SELECT 'tieWire', 2500 UNION ALL
  SELECT 'roofingSheets', 1200 UNION ALL
  SELECT 'purlins', 850 UNION ALL
  SELECT 'ridge', 150 UNION ALL
  SELECT 'flashing', 520 UNION ALL
  SELECT 'angleBar', 1550 UNION ALL
  SELECT 'gutter', 500 UNION ALL
  SELECT 'plywood', 2600 UNION ALL
  SELECT 'lumber', 44000 UNION ALL
  SELECT 'steelProps', 3200 UNION ALL
  SELECT 'scaffolding', 3200
) seed ON seed.material_key = mb.material_key
SET smp.stock_qty = seed.qty
WHERE smp.stock_qty IS NULL;

-- ---------------------------------------------------------------------------
-- Global default calibration constants (calibrationDefaults.js). project_id NULL
-- is the default row used when a project has no override.
-- ---------------------------------------------------------------------------
INSERT INTO estimation_constants (project_id, cement_factor, steel_factor, roofing_factor, wastage_percent)
VALUES (NULL, 1.08, 1.05, 1.07, 5.00);

-- Rebar priced per 6 m bar by size, provisional prices and assumed stock
-- (see migrations/036_rebar_per_size.sql).
INSERT INTO material_brands (material_key, material_name, unit, brand, spec, base_price, category, is_commodity)
SELECT CONCAT('rebar', s.mm, 'mm'), CONCAT('Rebar ', s.mm, 'mm'), 'pcs', mb.brand,
       CONCAT(COALESCE(mb.spec, 'Grade 40'), ', ', s.mm, 'mm x 6 m'),
       ROUND(s.ref_price * mb.base_price / 54500, 2), mb.category, 0
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

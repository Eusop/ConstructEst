-- ConstructEst seed data — mirrors the frontend's current mock data
-- (parsedProjectMock.js, brandOptionsMock.js, storesMock.js,
-- storePricing.js, calibrationDefaults.js) so swapping the frontend's mocks
-- for real API calls produces the same numbers it already shows today.
--
-- Run after schema.sql:
--   mysql -u root -p constructest < seed.sql

USE constructest;

-- ---------------------------------------------------------------------------
-- Admin account. Password is "ChangeMe123!" (hash generated and verified
-- against this exact string via `npm run hash-password -- "ChangeMe123!"`).
-- No admin UI/signup path exists, so this is the only way in; change the
-- password via PUT /api/users/me/password once you've logged in.
-- ---------------------------------------------------------------------------
-- email_verified_at is set at seed time (not left NULL) — that column only
-- means "did a self-registered user prove they own this email"; an admin
-- account created directly here never went through that flow and shouldn't
-- be blocked by login()'s check for it (see
-- db/migrations/013_backfill_email_verified_at.sql for the same fix applied
-- retroactively to an already-existing database).
INSERT INTO users (first_name, last_name, employee_id, email, password_hash, access_role, email_verified_at)
VALUES ('System', 'Admin', 'admin', 'admin@constructest.local',
        '$2a$10$tsAJhcupRMJt1XVsmBIiQe1M4qMcXQ6JaBs6JUcnEQRJjdpWZcUqq', 'admin', NOW());

-- ---------------------------------------------------------------------------
-- Material catalog: 14 brand-selectable materials x 3 brands, plus the 2
-- commodity aggregates (sand, gravel) priced flat with no brand choice —
-- matches BASE_PRICING/MATERIAL_BRAND_OPTIONS in brandOptionsMock.js.
-- ---------------------------------------------------------------------------
INSERT INTO material_brands (material_key, material_name, unit, brand, spec, base_price, quality, category, is_commodity) VALUES
('hollowBlocks', 'CHB (Concrete Hollow Blocks)', 'pcs', 'JBC', '4" CHB', 12, 4, 'Masonry', 0),
('hollowBlocks', 'CHB (Concrete Hollow Blocks)', 'pcs', 'Eagle Blocks', '4" CHB', 10, 3, 'Masonry', 0),
('hollowBlocks', 'CHB (Concrete Hollow Blocks)', 'pcs', 'Eversafe', '4" CHB', 14, 5, 'Masonry', 0),

('cement', 'Cement', 'bags', 'Republic', '40kg', 255, 4, 'Cementitious', 0),
('cement', 'Cement', 'bags', 'Holcim', '40kg', 268, 5, 'Cementitious', 0),
('cement', 'Cement', 'bags', 'Eagle', '40kg', 239, 3, 'Cementitious', 0),

('sand', 'Sand', 'm3', 'Local', NULL, 1300, NULL, 'Aggregate', 1),
('gravel', 'Gravel', 'm3', 'Local', NULL, 1250, NULL, 'Aggregate', 1),

('steelRebar', 'Rebar', 'tons', 'SteelAsia', 'Grade 40', 58000, 5, 'Reinforcement', 0),
('steelRebar', 'Rebar', 'tons', 'Capitol Steel', 'Grade 40', 54500, 3, 'Reinforcement', 0),
('steelRebar', 'Rebar', 'tons', 'Pag-asa Steel', 'Grade 40', 61200, 4, 'Reinforcement', 0),

('tieWire', 'Tie Wire', 'kg', 'Local GI', '#16 gauge', 85, 3, 'Reinforcement', 0),
('tieWire', 'Tie Wire', 'kg', 'Firmex', '#16 gauge', 90, 4, 'Reinforcement', 0),
('tieWire', 'Tie Wire', 'kg', 'GalvSteel', '#16 gauge', 105, 5, 'Reinforcement', 0),

('roofingSheets', 'Roofing', 'm2', 'DN Steel', '0.4mm', 520, 4, 'Roofing', 0),
('roofingSheets', 'Roofing', 'm2', 'Clark Steel', '0.5mm', 585, 5, 'Roofing', 0),
('roofingSheets', 'Roofing', 'm2', 'MetroTile', '0.35mm', 470, 3, 'Roofing', 0),

('purlins', 'Purlins', 'lengths', 'MetroTile', '2"x3" C-purlin, 6m', 750, 3, 'Roofing', 0),
('purlins', 'Purlins', 'lengths', 'DN Steel', '2"x3" C-purlin, 6m', 850, 4, 'Roofing', 0),
('purlins', 'Purlins', 'lengths', 'Clark Steel', '2"x3" C-purlin, 6m', 980, 5, 'Roofing', 0),

('ridge', 'Ridge', 'lengths', 'MetroTile', 'Ridge roll, 6m', 390, 3, 'Roofing', 0),
('ridge', 'Ridge', 'lengths', 'DN Steel', 'Ridge roll, 6m', 450, 4, 'Roofing', 0),
('ridge', 'Ridge', 'lengths', 'Clark Steel', 'Ridge roll, 6m', 520, 5, 'Roofing', 0),

('flashing', 'Flashing', 'pcs', 'MetroTile', 'GI flashing, 1.8m length', 270, 3, 'Roofing', 0),
('flashing', 'Flashing', 'pcs', 'DN Steel', 'GI flashing, 1.8m length', 324, 4, 'Roofing', 0),
('flashing', 'Flashing', 'pcs', 'Clark Steel', 'GI flashing, 1.8m length', 378, 5, 'Roofing', 0),

('angleBar', 'Angle Bar', 'lengths', 'Capitol Steel', '1/4"x1.5"x1.5", 6m', 560, 3, 'Roofing', 0),
('angleBar', 'Angle Bar', 'lengths', 'SteelAsia', '1/4"x1.5"x1.5", 6m', 620, 4, 'Roofing', 0),
('angleBar', 'Angle Bar', 'lengths', 'Pag-asa Steel', '1/4"x1.5"x1.5", 6m', 680, 5, 'Roofing', 0),

('gutter', 'Gutter', 'pcs', 'MetroTile', 'GI gutter, 1.8m length', 320, 3, 'Roofing', 0),
('gutter', 'Gutter', 'pcs', 'DN Steel', 'GI gutter, 1.8m length', 380, 4, 'Roofing', 0),
('gutter', 'Gutter', 'pcs', 'Clark Steel', 'GI gutter, 1.8m length', 440, 5, 'Roofing', 0),

('plywood', 'Plywood', 'pcs', 'Generic Marine', '1/2" 4x8ft', 680, 3, 'Formwork', 0),
('plywood', 'Plywood', 'pcs', 'Federation', '1/2" 4x8ft', 780, 4, 'Formwork', 0),
('plywood', 'Plywood', 'pcs', 'Basilisa', '1/2" 4x8ft marine', 920, 5, 'Formwork', 0),

('lumber', 'Lumber', 'bd.ft.', 'Local Coco Lumber', '2"x2"x10ft', 24, 3, 'Formwork', 0),
('lumber', 'Lumber', 'bd.ft.', 'Goodwood', '2"x2"x10ft', 28.5, 4, 'Formwork', 0),
('lumber', 'Lumber', 'bd.ft.', 'Primewood', '2"x2"x10ft', 34.5, 5, 'Formwork', 0),

('steelProps', 'Steel Props', 'pcs', 'Generic Steel Props', 'Adjustable, 3m', 1250, 3, 'Formwork', 0),
('steelProps', 'Steel Props', 'pcs', 'FormWorks PH', 'Adjustable, 3m', 1450, 4, 'Formwork', 0),
('steelProps', 'Steel Props', 'pcs', 'Doka', 'Adjustable, 3m', 1750, 5, 'Formwork', 0),

('scaffolding', 'Scaffolding', 'sets', 'Generic Scaffold', 'H-frame set', 2800, 3, 'Formwork', 0),
('scaffolding', 'Scaffolding', 'sets', 'Bosco Scaffolding', 'H-frame set', 3200, 4, 'Formwork', 0),
('scaffolding', 'Scaffolding', 'sets', 'Layher', 'H-frame set', 3900, 5, 'Formwork', 0);

-- ---------------------------------------------------------------------------
-- Stores — matches storesMock.js (Tarlac City locale).
-- ---------------------------------------------------------------------------
INSERT INTO stores (id, name, address, lat, lng) VALUES
(1, 'Tarlac Builders Depot', 'MacArthur Hwy, San Roque, Tarlac City', 15.480200, 120.597900),
(2, 'JRS Hardware Supply', 'Romulo Blvd, San Sebastian, Tarlac City', 15.485000, 120.605000),
(3, 'Northgate Home Center', 'Circumferential Rd, Tarlac City', 15.465000, 120.590000),
(4, 'Villaflor Hardware', 'San Miguel, Tarlac City', 15.490000, 120.580000);

-- Per-store price multiplier applied to every brand's base_price, matching
-- STORE_PRICE_MULTIPLIERS in storePricing.js. Villaflor Hardware (store 4)
-- deliberately gets no steelRebar rows at all, reproducing storesMock.js's
-- "out of stock: steel rebar, try Tarlac Builders Depot" scenario that
-- exercises the Store Locator's unavailability notification (FR-11).
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

-- ---------------------------------------------------------------------------
-- Global default calibration constants — matches calibrationDefaults.js.
-- project_id NULL = the global default row read when a project has no
-- override.
-- ---------------------------------------------------------------------------
INSERT INTO estimation_constants (project_id, cement_factor, steel_factor, roofing_factor, wastage_percent)
VALUES (NULL, 1.08, 1.05, 1.07, 5.00);

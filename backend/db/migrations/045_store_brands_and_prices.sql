-- Brand mix and prices for Tarlac Builders Depot, JRS Hardware Supply and
-- Northgate Home Center (2026-10-29). Villaflor Hardware is not touched.
--
-- 1. Prices: brands that were far from 2026 online price references get a
--    new base price. Each store keeps its own markup over base (Tarlac
--    Builders Depot 0%, JRS 1.5%, Northgate 2.4%). These are online
--    references (national, not a Tarlac canvass), except plywood and
--    scaffolding which follow the CitiHardware canvass
--    (docs/hardware-canvass-results.md). Sources:
--      CHB: aedoconstruction.com CHB price 2026, keansolidblocks.com.ph
--      Lumber: philconprices.com Q1 2026 (coco), shop.wilcon.com.ph Ecofor 2x2x10
--      Angle bar: toolsph.com, philconprices.com, ranflexmetals.com
--      C-purlins: alphasteel.ph, business.shoppable.ph, theprojectestimate.com
--      Steel props: screwking.ph shoring jack
--      Plywood: CitiHardware canvass, vinawoodltd.com, theprojectestimate.com
--      Cement: corporate.allhome.com.ph
--    Rebar, tie wire, roofing sheets, gutter, flashing, ridge, sand and
--    gravel are not changed.
--
-- 2. Brands: each store now sells 2 of the 3 brands of a material, so every
--    brand is still sold in 2 stores and prices can be compared. Sand and
--    gravel stay at all stores. Roofing sheets, ridge, gutter, flashing and
--    C-purlins use the same brands per store so colors match. Northgate
--    keeps all 3 lumber brands.
--
-- Saved projects whose brand is no longer sold at their store fall back to
-- that store's cheapest brand (optimization.service.js computeBom).
-- Safe to run twice: the price step gives the same result, and the delete
-- step finds nothing the second time.
--
-- Run against the local database:
--   mysql -u root -p constructest < db/migrations/045_store_brands_and_prices.sql
-- On Railway, paste everything below into the database query tab.

-- Step 1a: store prices, scaled by the store's current markup over base.
-- Must run before 1b, because it uses the old base price.
UPDATE store_material_prices smp
JOIN material_brands mb ON mb.id = smp.material_brand_id
JOIN stores s ON s.id = smp.store_id
SET smp.price = ROUND(smp.price / mb.base_price * CASE CONCAT(mb.material_key, '|', mb.brand)
    WHEN 'hollowBlocks|Eagle Blocks' THEN 16
    WHEN 'hollowBlocks|JBC' THEN 18
    WHEN 'hollowBlocks|Eversafe' THEN 20
    WHEN 'lumber|Local Coco Lumber' THEN 37
    WHEN 'lumber|Goodwood' THEN 60
    WHEN 'lumber|Primewood' THEN 95
    WHEN 'angleBar|Capitol Steel' THEN 880
    WHEN 'angleBar|SteelAsia' THEN 950
    WHEN 'angleBar|Pag-asa Steel' THEN 1000
    WHEN 'purlins|MetroTile' THEN 560
    WHEN 'purlins|DN Steel' THEN 600
    WHEN 'purlins|Clark Steel' THEN 650
    WHEN 'scaffolding|Generic Scaffold' THEN 3575
    WHEN 'scaffolding|Bosco Scaffolding' THEN 4200
    WHEN 'scaffolding|Layher' THEN 4995
    WHEN 'steelProps|Generic Steel Props' THEN 1050
    WHEN 'steelProps|FormWorks PH' THEN 1185
    WHEN 'plywood|Generic Marine' THEN 800
    WHEN 'plywood|Federation' THEN 880
    WHEN 'plywood|Basilisa' THEN 950
    WHEN 'cement|Eagle' THEN 250
    WHEN 'cement|Holcim' THEN 260
    WHEN 'cement|Republic' THEN 275
  END, 2)
WHERE s.name IN ('Tarlac Builders Depot', 'JRS Hardware Supply', 'Northgate Home Center')
  AND CONCAT(mb.material_key, '|', mb.brand) IN (
    'hollowBlocks|Eagle Blocks', 'hollowBlocks|JBC', 'hollowBlocks|Eversafe',
    'lumber|Local Coco Lumber', 'lumber|Goodwood', 'lumber|Primewood',
    'angleBar|Capitol Steel', 'angleBar|SteelAsia', 'angleBar|Pag-asa Steel',
    'purlins|MetroTile', 'purlins|DN Steel', 'purlins|Clark Steel',
    'scaffolding|Generic Scaffold', 'scaffolding|Bosco Scaffolding', 'scaffolding|Layher',
    'steelProps|Generic Steel Props', 'steelProps|FormWorks PH',
    'plywood|Generic Marine', 'plywood|Federation', 'plywood|Basilisa',
    'cement|Eagle', 'cement|Holcim', 'cement|Republic'
  );

-- Step 1b: the new base prices.
UPDATE material_brands
SET base_price = CASE CONCAT(material_key, '|', brand)
    WHEN 'hollowBlocks|Eagle Blocks' THEN 16
    WHEN 'hollowBlocks|JBC' THEN 18
    WHEN 'hollowBlocks|Eversafe' THEN 20
    WHEN 'lumber|Local Coco Lumber' THEN 37
    WHEN 'lumber|Goodwood' THEN 60
    WHEN 'lumber|Primewood' THEN 95
    WHEN 'angleBar|Capitol Steel' THEN 880
    WHEN 'angleBar|SteelAsia' THEN 950
    WHEN 'angleBar|Pag-asa Steel' THEN 1000
    WHEN 'purlins|MetroTile' THEN 560
    WHEN 'purlins|DN Steel' THEN 600
    WHEN 'purlins|Clark Steel' THEN 650
    WHEN 'scaffolding|Generic Scaffold' THEN 3575
    WHEN 'scaffolding|Bosco Scaffolding' THEN 4200
    WHEN 'scaffolding|Layher' THEN 4995
    WHEN 'steelProps|Generic Steel Props' THEN 1050
    WHEN 'steelProps|FormWorks PH' THEN 1185
    WHEN 'plywood|Generic Marine' THEN 800
    WHEN 'plywood|Federation' THEN 880
    WHEN 'plywood|Basilisa' THEN 950
    WHEN 'cement|Eagle' THEN 250
    WHEN 'cement|Holcim' THEN 260
    WHEN 'cement|Republic' THEN 275
  END
WHERE CONCAT(material_key, '|', brand) IN (
    'hollowBlocks|Eagle Blocks', 'hollowBlocks|JBC', 'hollowBlocks|Eversafe',
    'lumber|Local Coco Lumber', 'lumber|Goodwood', 'lumber|Primewood',
    'angleBar|Capitol Steel', 'angleBar|SteelAsia', 'angleBar|Pag-asa Steel',
    'purlins|MetroTile', 'purlins|DN Steel', 'purlins|Clark Steel',
    'scaffolding|Generic Scaffold', 'scaffolding|Bosco Scaffolding', 'scaffolding|Layher',
    'steelProps|Generic Steel Props', 'steelProps|FormWorks PH',
    'plywood|Generic Marine', 'plywood|Federation', 'plywood|Basilisa',
    'cement|Eagle', 'cement|Holcim', 'cement|Republic'
  );

-- Step 2: brands each store does not sell anymore.
DELETE smp FROM store_material_prices smp
JOIN material_brands mb ON mb.id = smp.material_brand_id
JOIN stores s ON s.id = smp.store_id
WHERE s.name = 'Tarlac Builders Depot' AND (
     (mb.material_key = 'cement' AND mb.brand = 'Eagle')
  OR (mb.material_key = 'hollowBlocks' AND mb.brand = 'Eagle Blocks')
  OR (mb.material_key IN ('steelRebar', 'rebar10mm', 'rebar12mm', 'rebar16mm', 'angleBar') AND mb.brand = 'Pag-asa Steel')
  OR (mb.material_key = 'tieWire' AND mb.brand = 'GalvSteel')
  OR (mb.material_key = 'plywood' AND mb.brand = 'Generic Marine')
  OR (mb.material_key = 'lumber' AND mb.brand = 'Primewood')
  OR (mb.material_key IN ('roofingSheets', 'ridge', 'gutter', 'flashing', 'purlins') AND mb.brand = 'Clark Steel')
  OR (mb.material_key = 'steelProps' AND mb.brand = 'Doka')
  OR (mb.material_key = 'scaffolding' AND mb.brand = 'Layher')
);

DELETE smp FROM store_material_prices smp
JOIN material_brands mb ON mb.id = smp.material_brand_id
JOIN stores s ON s.id = smp.store_id
WHERE s.name = 'JRS Hardware Supply' AND (
     (mb.material_key = 'cement' AND mb.brand = 'Republic')
  OR (mb.material_key = 'hollowBlocks' AND mb.brand = 'Eversafe')
  OR (mb.material_key IN ('steelRebar', 'rebar10mm', 'rebar12mm', 'rebar16mm', 'angleBar') AND mb.brand = 'SteelAsia')
  OR (mb.material_key = 'tieWire' AND mb.brand = 'Firmex')
  OR (mb.material_key = 'plywood' AND mb.brand = 'Basilisa')
  OR (mb.material_key = 'lumber' AND mb.brand = 'Goodwood')
  OR (mb.material_key IN ('roofingSheets', 'ridge', 'gutter', 'flashing', 'purlins') AND mb.brand = 'MetroTile')
  OR (mb.material_key = 'steelProps' AND mb.brand = 'FormWorks PH')
  OR (mb.material_key = 'scaffolding' AND mb.brand = 'Generic Scaffold')
);

DELETE smp FROM store_material_prices smp
JOIN material_brands mb ON mb.id = smp.material_brand_id
JOIN stores s ON s.id = smp.store_id
WHERE s.name = 'Northgate Home Center' AND (
     (mb.material_key = 'cement' AND mb.brand = 'Holcim')
  OR (mb.material_key = 'hollowBlocks' AND mb.brand = 'JBC')
  OR (mb.material_key IN ('steelRebar', 'rebar10mm', 'rebar12mm', 'rebar16mm', 'angleBar') AND mb.brand = 'Capitol Steel')
  OR (mb.material_key = 'tieWire' AND mb.brand = 'Local GI')
  OR (mb.material_key = 'plywood' AND mb.brand = 'Federation')
  OR (mb.material_key IN ('roofingSheets', 'ridge', 'gutter', 'flashing', 'purlins') AND mb.brand = 'DN Steel')
  OR (mb.material_key = 'steelProps' AND mb.brand = 'Generic Steel Props')
  OR (mb.material_key = 'scaffolding' AND mb.brand = 'Bosco Scaffolding')
);

-- Check: brands per store after the change.
SELECT s.name AS store, mb.material_key, GROUP_CONCAT(CONCAT(mb.brand, ' ', smp.price) ORDER BY smp.price SEPARATOR ', ') AS brands
FROM store_material_prices smp
JOIN material_brands mb ON mb.id = smp.material_brand_id
JOIN stores s ON s.id = smp.store_id
WHERE s.name IN ('Tarlac Builders Depot', 'JRS Hardware Supply', 'Northgate Home Center')
GROUP BY s.name, mb.material_key
ORDER BY mb.material_key, s.name;

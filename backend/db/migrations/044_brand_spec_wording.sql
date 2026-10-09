-- Spec wording from the engineer (2026-10-10): rebar without "Grade 40",
-- roofing sheet thickness says "thick", and ridge roll, flashing and gutter
-- show only their length, which is 2.40 m (the normal size, he says). The
-- engine now counts those three in 2.4 m pieces too (formulas.py).
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/044_brand_spec_wording.sql

USE constructest;

UPDATE material_brands SET spec = TRIM(REPLACE(spec, 'Grade 40, ', ''))
 WHERE material_key IN ('rebar10mm', 'rebar12mm', 'rebar16mm');
UPDATE material_brands SET spec = NULL
 WHERE material_key = 'steelRebar' AND spec = 'Grade 40';
UPDATE material_brands SET spec = CONCAT(spec, ' thick')
 WHERE material_key = 'roofingSheets' AND spec LIKE '%mm' AND spec NOT LIKE '%thick';
UPDATE material_brands SET spec = '2.40m'
 WHERE material_key IN ('ridge', 'flashing', 'gutter');

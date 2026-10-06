-- Buying some materials at another store (tech adviser, 2026-10-06): each
-- material can have its own supplier, or be left out of the BOM (bought
-- elsewhere or already on hand). No row means the project's selected store.
-- store_id cascades on delete, so a removed store falls back to the
-- selected store.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/038_material_suppliers.sql

USE constructest;

CREATE TABLE IF NOT EXISTS project_material_suppliers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  material_key VARCHAR(50) NOT NULL,
  store_id INT UNSIGNED NULL,
  excluded TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pms_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_pms_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  UNIQUE KEY uq_pms_project_material (project_id, material_key)
) ENGINE=InnoDB;

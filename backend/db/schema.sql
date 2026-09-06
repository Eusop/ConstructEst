-- ConstructEst backend schema (MySQL 8+)
-- Run against an empty database, e.g.:
--   mysql -u root -p constructest < schema.sql

CREATE DATABASE IF NOT EXISTS constructest CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE constructest;

-- ---------------------------------------------------------------------------
-- Users. Two access roles only (`user`, `admin`) per the project's confirmed
-- design — homeowner/engineer are both `user`.
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  employee_id VARCHAR(50) NOT NULL UNIQUE,   -- login identifier (SignUpForm's employeeId)
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  access_role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  avatar_url VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  -- Self-registered accounts start unverified (register sets this to 0
  -- explicitly); admin-created accounts and every pre-existing row take the
  -- column default (1) — see db/migrations/008_users_is_verified.sql.
  is_verified TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Projects (one per uploaded floor plan / estimation run).
-- ---------------------------------------------------------------------------
CREATE TABLE projects (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  project_name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  budget_ceiling DECIMAL(14, 2) NOT NULL,
  storeys TINYINT UNSIGNED NOT NULL DEFAULT 1,
  include_roofing TINYINT(1) NOT NULL DEFAULT 1,
  status ENUM('parsing', 'parsed', 'failed') NOT NULL DEFAULT 'parsing',
  dxf_file_path VARCHAR(500) NULL,
  dxf_original_name VARCHAR(255) NULL,
  second_floor_dxf_path VARCHAR(500) NULL,
  second_floor_dxf_original_name VARCHAR(255) NULL,
  selected_store_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Estimation results: one row per computed run of the rule-based engine for
-- a project (re-running after a calibration change adds a new row rather
-- than overwriting, matching FR-9/FR-17's "previously saved estimations are
-- not retroactively affected").
-- ---------------------------------------------------------------------------
CREATE TABLE estimation_results (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  total_wall_length DECIMAL(10, 2) NULL,   -- meters
  floor_area DECIMAL(10, 2) NULL,          -- m^2
  roof_area DECIMAL(10, 2) NULL,           -- m^2
  rooms_detected SMALLINT UNSIGNED NULL,
  -- Additional detail the DXF engine already computes alongside the figures
  -- above — see engine/formulas.py's `measurements` dict and the "Detailed
  -- extraction information" section on the Results page.
  door_area DECIMAL(10, 2) NULL,           -- m^2
  window_area DECIMAL(10, 2) NULL,         -- m^2
  column_count SMALLINT UNSIGNED NULL,
  floor_perimeter DECIMAL(10, 2) NULL,     -- meters
  roof_perimeter DECIMAL(10, 2) NULL,      -- meters
  roof_ridge_length DECIMAL(10, 2) NULL,   -- meters
  -- Per-floor breakdown, populated only when a real second-floor DXF was
  -- uploaded (see engine/formulas.py's geometry2/measurements.groundFloor
  -- and .secondFloor) — NULL for every single-file project.
  ground_wall_length DECIMAL(10, 2) NULL,
  ground_floor_area DECIMAL(10, 2) NULL,
  second_wall_length DECIMAL(10, 2) NULL,
  second_floor_area DECIMAL(10, 2) NULL,
  estimated_cost DECIMAL(14, 2) NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 1,
  computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_estimation_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Quantity take-off line items for one estimation run. `material_key` is the
-- stable identifier already used throughout the frontend (hollowBlocks,
-- cement, sand, gravel, steelRebar, tieWire, roofingSheets, purlins, ridge,
-- flashing, angleBar, plywood, lumber, steelProps, scaffolding).
CREATE TABLE estimation_line_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  estimation_id INT UNSIGNED NOT NULL,
  material_key VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  quantity DECIMAL(12, 3) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  basis VARCHAR(255) NULL,
  -- {ground, second, roofing, shared} -> amount (see formulas.py's
  -- SOURCE_CATEGORIES) — lets the Quantity Take-off's "By source" view
  -- group this material without touching `quantity`, which every existing
  -- consumer (pricing, BOM, optimization) still reads unchanged.
  source_breakdown JSON NULL,
  CONSTRAINT fk_line_item_estimation FOREIGN KEY (estimation_id) REFERENCES estimation_results(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Material brand catalog (admin-managed). `is_commodity` marks sand/gravel:
-- priced flat, never shown in Brand Selection, matching BASE_PRICING's split
-- in brandOptionsMock.js.
-- ---------------------------------------------------------------------------
CREATE TABLE material_brands (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  material_key VARCHAR(50) NOT NULL,
  material_name VARCHAR(150) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  spec VARCHAR(150) NULL,
  base_price DECIMAL(12, 2) NOT NULL,
  quality TINYINT UNSIGNED NULL,          -- 1-5, used by the Premium/Budget tiers
  category VARCHAR(50) NULL,
  is_commodity TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_material_brands_key ON material_brands(material_key);

-- ---------------------------------------------------------------------------
-- Hardware stores (admin-managed) + per-store material availability/pricing.
-- ---------------------------------------------------------------------------
CREATE TABLE stores (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NOT NULL,
  lat DECIMAL(10, 6) NOT NULL,
  lng DECIMAL(10, 6) NOT NULL,
  -- Deactivated stores drop out of the Store Locator comparison entirely
  -- (see optimization.service.js's getStoreOptimization) but stay visible
  -- and editable in the Admin Module — mirrors users' is_active, reversible
  -- via the same typed DEACTIVATE/REACTIVATE confirmation pattern.
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

ALTER TABLE projects
  ADD CONSTRAINT fk_projects_store FOREIGN KEY (selected_store_id) REFERENCES stores(id) ON DELETE SET NULL;

-- A store may carry only some brands (partial store entries, per FR-17) —
-- absence of a row here means "not carried", not "price 0".
CREATE TABLE store_material_prices (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  store_id INT UNSIGNED NOT NULL,
  material_brand_id INT UNSIGNED NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  in_stock TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_smp_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_smp_brand FOREIGN KEY (material_brand_id) REFERENCES material_brands(id) ON DELETE CASCADE,
  UNIQUE KEY uq_store_brand (store_id, material_brand_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Per-project brand selection (Brand Selection page's "choices" object).
-- ---------------------------------------------------------------------------
CREATE TABLE project_brand_selections (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  material_key VARCHAR(50) NOT NULL,
  material_brand_id INT UNSIGNED NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pbs_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_pbs_brand FOREIGN KEY (material_brand_id) REFERENCES material_brands(id) ON DELETE CASCADE,
  UNIQUE KEY uq_project_material (project_id, material_key)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Estimation calibration constants. One global default row (project_id
-- NULL); a project may override it (matches Settings page + FR-9's
-- per-project calibration, FR-18's admin-managed defaults).
-- ---------------------------------------------------------------------------
CREATE TABLE estimation_constants (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NULL,
  cement_factor DECIMAL(6, 3) NOT NULL DEFAULT 1.08,
  steel_factor DECIMAL(6, 3) NOT NULL DEFAULT 1.05,
  roofing_factor DECIMAL(6, 3) NOT NULL DEFAULT 1.07,
  wastage_percent DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_constants_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY uq_constants_project (project_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Per-project structural design parameter overrides — see
-- db/migrations/001_project_design_overrides.sql for the full rationale.
-- Every column NULL means "use the engine's built-in default".
-- ---------------------------------------------------------------------------
CREATE TABLE project_design_overrides (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NULL, -- NULL = admin-managed global default row
  column_width DECIMAL(6, 3) NULL,
  column_depth DECIMAL(6, 3) NULL,
  column_height DECIMAL(6, 3) NULL,
  column_count SMALLINT UNSIGNED NULL,
  beam_width DECIMAL(6, 3) NULL,
  beam_depth DECIMAL(6, 3) NULL,
  beam_length DECIMAL(10, 2) NULL,
  footing_width DECIMAL(6, 3) NULL,
  footing_length DECIMAL(6, 3) NULL,
  footing_depth DECIMAL(6, 3) NULL,
  floor_to_floor_height DECIMAL(6, 3) NULL,
  stair_width DECIMAL(6, 3) NULL,
  building_height DECIMAL(6, 3) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_design_overrides_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY uq_design_overrides_project (project_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Notifications + dashboard activity feed.
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message VARCHAR(500) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE activity_log (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  project_id INT UNSIGNED NULL,
  type VARCHAR(50) NOT NULL,
  message VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_activity_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Admin activity backlog — a separate, persisted, append-only audit trail
-- for Admin Module actions (distinct from the User Module's activity_log
-- above). Categorized into User Management / Store Management (see the
-- Admin Activity Log page). No UPDATE/DELETE route is ever exposed for this
-- table — immutability, even to the admin, is structural.
-- ---------------------------------------------------------------------------
CREATE TABLE admin_activity_log (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_user_id INT UNSIGNED NOT NULL,
  category ENUM('user_management', 'store_management') NOT NULL,
  action VARCHAR(50) NOT NULL,
  message VARCHAR(500) NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_activity_admin FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

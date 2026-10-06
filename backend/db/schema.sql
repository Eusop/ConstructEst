-- ConstructEst backend schema (MySQL 8+)
-- Run against an empty database, e.g.:
--   mysql -u root -p constructest < schema.sql

CREATE DATABASE IF NOT EXISTS constructest CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE constructest;

-- ---------------------------------------------------------------------------
-- Users. Two access roles (`user`, `admin`). Homeowner and engineer are both `user`.
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  user_id VARCHAR(20) NOT NULL UNIQUE,   -- login ID the system assigns, year + 4 digits (e.g. 20260001)
  email VARCHAR(255) NOT NULL UNIQUE,
  -- A new email waits here until the code sent to it is entered (migration 037).
  pending_email VARCHAR(255) NULL,
  email_change_code CHAR(6) NULL,
  email_change_expires_at TIMESTAMP NULL,
  email_change_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  email_change_last_sent_at TIMESTAMP NULL,
  password_hash VARCHAR(255) NOT NULL,
  access_role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  avatar_url VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  -- Self-registered accounts start unverified (register sets 0). Admin-created
  -- accounts and existing rows use the default (1). See migration 008.
  is_verified TINYINT(1) NOT NULL DEFAULT 1,
  -- Independent of is_verified. Set when the owner types back the code
  -- sent to their email. Cleared when an admin changes the email (migration 037). See migration 012 and
  -- auth.controller.js (register, verifyEmail, resendVerificationCode).
  email_verified_at TIMESTAMP NULL,
  email_verification_code CHAR(6) NULL,
  email_verification_expires_at TIMESTAMP NULL,
  email_verification_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  email_verification_last_sent_at TIMESTAMP NULL,
  -- Separate from the email_verification_* columns so the two flows can't
  -- overwrite each other's code. See migration 014 and auth.controller.js
  -- (forgotPassword, resetPassword).
  password_reset_code CHAR(6) NULL,
  password_reset_expires_at TIMESTAMP NULL,
  password_reset_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  -- Admin temporary password (migration 030): must set a new one at sign in.
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  temp_password_expires_at DATETIME NULL,
  password_reset_last_sent_at TIMESTAMP NULL,
  -- "Online now" for the admin module. Set on login and refreshed by the
  -- heartbeat (migration 015). NULL means never logged in.
  last_seen_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Last User ID number given out per year (migration 024). Only goes up, so a
-- deleted user's ID is never given to someone else.
CREATE TABLE user_id_counters (
  id_year SMALLINT UNSIGNED PRIMARY KEY,
  last_seq INT UNSIGNED NOT NULL
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
-- Estimation results: one row per engine run for a project. Re-running after
-- a calibration change adds a new row, so saved estimations are not changed
-- (FR-9/FR-17).
-- ---------------------------------------------------------------------------
CREATE TABLE estimation_results (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  total_wall_length DECIMAL(10, 2) NULL,   -- meters
  floor_area DECIMAL(10, 2) NULL,          -- m^2
  roof_area DECIMAL(10, 2) NULL,           -- m^2
  rooms_detected SMALLINT UNSIGNED NULL,
  -- Extra details the engine computes (see formulas.py `measurements`), shown
  -- in "Detailed extraction information" on the Results page.
  door_area DECIMAL(10, 2) NULL,           -- m^2
  window_area DECIMAL(10, 2) NULL,         -- m^2
  column_count SMALLINT UNSIGNED NULL,
  floor_perimeter DECIMAL(10, 2) NULL,     -- meters
  roof_perimeter DECIMAL(10, 2) NULL,      -- meters
  roof_ridge_length DECIMAL(10, 2) NULL,   -- meters
  -- Per-floor breakdown, only filled when a second floor DXF was uploaded
  -- (see formulas.py measurements.groundFloor and .secondFloor). NULL otherwise.
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
-- flashing, angleBar, gutter, plywood, lumber, steelProps, scaffolding).
CREATE TABLE estimation_line_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  estimation_id INT UNSIGNED NOT NULL,
  material_key VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  quantity DECIMAL(12, 3) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  basis VARCHAR(255) NULL,
  -- {ground, second, roofing, shared} -> amount (see SOURCE_CATEGORIES in
  -- formulas.py). Used by the "By source" view without changing `quantity`.
  source_breakdown JSON NULL,
  -- Step-by-step computation lines from the engine ("Show computation").
  calc_steps JSON NULL,
  bar_pieces JSON NULL,
  CONSTRAINT fk_line_item_estimation FOREIGN KEY (estimation_id) REFERENCES estimation_results(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Material brand catalog (admin-managed). `is_commodity` marks sand and gravel,
-- which are priced flat and never shown in Brand Selection.
-- ---------------------------------------------------------------------------
CREATE TABLE material_brands (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  material_key VARCHAR(50) NOT NULL,
  material_name VARCHAR(150) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  spec VARCHAR(150) NULL,
  base_price DECIMAL(12, 2) NOT NULL,
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
  -- Deactivated stores drop out of Store Locator (see getStoreOptimization in
  -- optimization.service.js) but stay editable in the admin module. Same idea
  -- as users' is_active.
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

ALTER TABLE projects
  ADD CONSTRAINT fk_projects_store FOREIGN KEY (selected_store_id) REFERENCES stores(id) ON DELETE SET NULL;

-- A store may carry only some brands (FR-17). No row means "not carried",
-- not "price 0".
CREATE TABLE store_material_prices (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  store_id INT UNSIGNED NOT NULL,
  material_brand_id INT UNSIGNED NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  in_stock TINYINT(1) NOT NULL DEFAULT 1,
  -- Stock count in the price unit, NULL if unknown (migration 032).
  stock_qty DECIMAL(12, 2) NULL,
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

-- Per-material supplier (migration 038): another store for this material, or
-- left out of the BOM. No row means the project's selected store.
CREATE TABLE project_material_suppliers (
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
-- Per-project structural parameter overrides (rationale in migration 001).
-- NULL in a column means "use the engine's default".
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
  footing_thickness DECIMAL(6, 3) NULL,
  floor_to_floor_height DECIMAL(6, 3) NULL,
  second_floor_height DECIMAL(6, 3) NULL,
  stair_width DECIMAL(6, 3) NULL,
  building_height DECIMAL(6, 3) NULL,
  scaffolding_set_width DECIMAL(6, 3) NULL,
  scaffolding_set_height DECIMAL(6, 3) NULL,
  riser_height DECIMAL(6, 3) NULL,
  tread_depth DECIMAL(6, 3) NULL,
  waist_thickness DECIMAL(6, 3) NULL,
  stair_rebar_spacing DECIMAL(6, 3) NULL,
  scaffolding_set_count SMALLINT UNSIGNED NULL,
  column_width_second DECIMAL(6, 3) NULL,
  column_depth_second DECIMAL(6, 3) NULL,
  beam_rebar_length DECIMAL(10, 2) NULL,
  beam_rebar_diameter_mm SMALLINT UNSIGNED NULL,
  footing_count SMALLINT UNSIGNED NULL,
  footing_rebar_kg_per_m3 DECIMAL(6,1) NULL,
  ground_slab_bar_mm SMALLINT UNSIGNED NULL,
  ground_slab_bar_spacing DECIMAL(5,3) NULL,
  second_slab_bar_mm SMALLINT UNSIGNED NULL,
  second_slab_bar_spacing DECIMAL(5,3) NULL,
  column_bar_count SMALLINT UNSIGNED NULL,
  column_bar_mm SMALLINT UNSIGNED NULL,
  column_tie_mm SMALLINT UNSIGNED NULL,
  column_tie_spacing DECIMAL(5,3) NULL,
  column_rebar_kg_per_m3 DECIMAL(6,1) NULL,
  beam_rebar_kg_per_m3 DECIMAL(6,1) NULL,
  beam_stirrup_spacing DECIMAL(5,3) NULL,
  beam_stirrup_mm SMALLINT UNSIGNED NULL,
  formwork_uses TINYINT UNSIGNED NULL,
  scaffolding_uses SMALLINT UNSIGNED NULL,
  truss_framing_kg_per_m2 DECIMAL(6,2) NULL,
  angle_bar_kg_per_m DECIMAL(6,3) NULL,
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
-- Admin activity log: a separate, append-only audit trail for admin actions
-- (not the User Module's activity_log above). Split into User Management and
-- Store Management. No UPDATE or DELETE route exists, so even admins can't
-- change entries.
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

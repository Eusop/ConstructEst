import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { toPublicUser } from '../utils/serializers.js';
import { HttpError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getEffectiveConstants } from '../services/constants.service.js';
import { getDesignOverrides, saveDesignOverrides } from '../services/designOverrides.service.js';

// --- Users -------------------------------------------------------------

export const listUsers = asyncHandler(async (req, res) => {
  const users = await query('SELECT * FROM users ORDER BY created_at DESC');
  res.json({ users: users.map((u) => ({ ...toPublicUser(u), isActive: Boolean(u.is_active) })) });
});

export const createUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, userId, email, password, accessRole = 'user' } = req.body;
  if (!firstName || !lastName || !userId || !email || !password) {
    throw new HttpError(400, 'firstName, lastName, userId, email, and password are required.');
  }
  if (!['user', 'admin'].includes(accessRole)) throw new HttpError(400, 'accessRole must be "user" or "admin".');

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = await query(
    `INSERT INTO users (first_name, last_name, user_id, email, password_hash, access_role)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [firstName, lastName, userId, email, passwordHash, accessRole],
  );
  const [user] = await query('SELECT * FROM users WHERE id = ?', [result.insertId]);
  res.status(201).json({ user: toPublicUser(user) });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, accessRole } = req.body;
  const fields = [];
  const params = [];
  if (firstName !== undefined) { fields.push('first_name = ?'); params.push(firstName); }
  if (lastName !== undefined) { fields.push('last_name = ?'); params.push(lastName); }
  if (email !== undefined) { fields.push('email = ?'); params.push(email); }
  if (accessRole !== undefined) {
    if (!['user', 'admin'].includes(accessRole)) throw new HttpError(400, 'accessRole must be "user" or "admin".');
    fields.push('access_role = ?'); params.push(accessRole);
  }
  if (fields.length === 0) throw new HttpError(400, 'No fields to update.');

  params.push(req.params.id);
  await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
  const [user] = await query('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!user) throw new HttpError(404, 'User not found.');
  res.json({ user: toPublicUser(user) });
});

export const setUserActive = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  await query('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, req.params.id]);
  res.json({ message: isActive ? 'User reactivated.' : 'User deactivated.' });
});

// --- Material brands -----------------------------------------------------

export const listMaterials = asyncHandler(async (req, res) => {
  const materials = await query('SELECT * FROM material_brands ORDER BY material_key, brand');
  res.json({ materials });
});

export const createMaterial = asyncHandler(async (req, res) => {
  const { materialKey, materialName, unit, brand, spec, basePrice, quality, category, isCommodity } = req.body;
  if (!materialKey || !materialName || !unit || !brand || basePrice == null) {
    throw new HttpError(400, 'materialKey, materialName, unit, brand, and basePrice are required.');
  }
  const result = await query(
    `INSERT INTO material_brands (material_key, material_name, unit, brand, spec, base_price, quality, category, is_commodity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [materialKey, materialName, unit, brand, spec || null, basePrice, quality || null, category || null, isCommodity ? 1 : 0],
  );
  const [material] = await query('SELECT * FROM material_brands WHERE id = ?', [result.insertId]);
  res.status(201).json({ material });
});

export const updateMaterial = asyncHandler(async (req, res) => {
  const { materialName, unit, brand, spec, basePrice, quality, category } = req.body;
  const fields = [];
  const params = [];
  const set = (col, val) => { if (val !== undefined) { fields.push(`${col} = ?`); params.push(val); } };
  set('material_name', materialName);
  set('unit', unit);
  set('brand', brand);
  set('spec', spec);
  set('base_price', basePrice);
  set('quality', quality);
  set('category', category);
  if (fields.length === 0) throw new HttpError(400, 'No fields to update.');

  params.push(req.params.id);
  await query(`UPDATE material_brands SET ${fields.join(', ')} WHERE id = ?`, params);
  const [material] = await query('SELECT * FROM material_brands WHERE id = ?', [req.params.id]);
  if (!material) throw new HttpError(404, 'Material brand not found.');
  res.json({ material });
});

export const deleteMaterial = asyncHandler(async (req, res) => {
  await query('DELETE FROM material_brands WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

// --- Stores ----------------------------------------------------------------

export const createStore = asyncHandler(async (req, res) => {
  const { name, address, lat, lng } = req.body;
  if (!name || !address || lat == null || lng == null) throw new HttpError(400, 'name, address, lat, and lng are required.');
  const result = await query('INSERT INTO stores (name, address, lat, lng) VALUES (?, ?, ?, ?)', [name, address, lat, lng]);
  const [store] = await query('SELECT * FROM stores WHERE id = ?', [result.insertId]);
  res.status(201).json({ store });
});

export const updateStore = asyncHandler(async (req, res) => {
  const { name, address, lat, lng } = req.body;
  const fields = [];
  const params = [];
  const set = (col, val) => { if (val !== undefined) { fields.push(`${col} = ?`); params.push(val); } };
  set('name', name);
  set('address', address);
  set('lat', lat);
  set('lng', lng);
  if (fields.length === 0) throw new HttpError(400, 'No fields to update.');

  params.push(req.params.id);
  await query(`UPDATE stores SET ${fields.join(', ')} WHERE id = ?`, params);
  const [store] = await query('SELECT * FROM stores WHERE id = ?', [req.params.id]);
  if (!store) throw new HttpError(404, 'Store not found.');
  res.json({ store });
});

export const deleteStore = asyncHandler(async (req, res) => {
  await query('DELETE FROM stores WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

/** The full global material_brands catalog, left-joined against this
 * store's own store_material_prices rows — `storePrice`/`inStock` are null
 * for a brand this store hasn't priced yet, which is how the frontend
 * (AdminStoresContext) tells "available to add" apart from "already
 * stocked". Grouped by material_key so the admin UI can render one section
 * per material. */
export const getStoreCatalog = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT mb.id AS material_brand_id, mb.material_key, mb.material_name, mb.unit, mb.brand, mb.spec,
            mb.base_price, mb.quality, mb.category, mb.is_commodity,
            smp.price AS store_price, smp.in_stock AS store_in_stock
     FROM material_brands mb
     LEFT JOIN store_material_prices smp ON smp.material_brand_id = mb.id AND smp.store_id = ?
     ORDER BY mb.material_key, mb.brand`,
    [req.params.id],
  );

  const byKey = new Map();
  for (const row of rows) {
    if (!byKey.has(row.material_key)) {
      byKey.set(row.material_key, {
        materialKey: row.material_key,
        materialName: row.material_name,
        unit: row.unit,
        isCommodity: Boolean(row.is_commodity),
        brands: [],
      });
    }
    byKey.get(row.material_key).brands.push({
      materialBrandId: row.material_brand_id,
      brand: row.brand,
      spec: row.spec,
      basePrice: Number(row.base_price),
      quality: row.quality == null ? null : Number(row.quality),
      category: row.category,
      storePrice: row.store_price == null ? null : Number(row.store_price),
      inStock: row.store_in_stock == null ? null : Boolean(row.store_in_stock),
    });
  }

  res.json({ catalog: [...byKey.values()] });
});

export const upsertStoreMaterialPrice = asyncHandler(async (req, res) => {
  const { storeId, materialBrandId } = req.params;
  const { price, inStock = true } = req.body;
  if (price == null) throw new HttpError(400, 'price is required.');

  await query(
    `INSERT INTO store_material_prices (store_id, material_brand_id, price, in_stock)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE price = VALUES(price), in_stock = VALUES(in_stock)`,
    [storeId, materialBrandId, price, inStock ? 1 : 0],
  );
  res.json({ message: 'Store price saved.' });
});

export const removeStoreMaterialPrice = asyncHandler(async (req, res) => {
  const { storeId, materialBrandId } = req.params;
  await query('DELETE FROM store_material_prices WHERE store_id = ? AND material_brand_id = ?', [storeId, materialBrandId]);
  res.status(204).end();
});

// --- Global estimation constants -------------------------------------------

export const getGlobalConstants = asyncHandler(async (req, res) => {
  res.json({ constants: await getEffectiveConstants(null) });
});

// --- Global design-parameter defaults --------------------------------------

export const getGlobalDesignOverrides = asyncHandler(async (req, res) => {
  res.json({ overrides: await getDesignOverrides(null) });
});

export const updateGlobalDesignOverrides = asyncHandler(async (req, res) => {
  res.json({ overrides: await saveDesignOverrides(null, req.body) });
});

export const updateGlobalConstants = asyncHandler(async (req, res) => {
  const { cementFactor, steelFactor, roofingFactor, wastagePercent } = req.body;

  // MySQL unique indexes treat every NULL as distinct, so `ON DUPLICATE KEY
  // UPDATE` never matches the project_id IS NULL row — upsert explicitly.
  const [existing] = await query('SELECT id FROM estimation_constants WHERE project_id IS NULL');
  if (existing) {
    await query(
      `UPDATE estimation_constants
       SET cement_factor = ?, steel_factor = ?, roofing_factor = ?, wastage_percent = ?
       WHERE id = ?`,
      [cementFactor, steelFactor, roofingFactor, wastagePercent, existing.id],
    );
  } else {
    await query(
      `INSERT INTO estimation_constants (project_id, cement_factor, steel_factor, roofing_factor, wastage_percent)
       VALUES (NULL, ?, ?, ?, ?)`,
      [cementFactor, steelFactor, roofingFactor, wastagePercent],
    );
  }

  res.json({ constants: await getEffectiveConstants(null) });
});

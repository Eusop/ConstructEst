import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { toPublicUser } from '../utils/serializers.js';
import { HttpError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getEffectiveConstants } from '../services/constants.service.js';
import { getDesignOverrides, saveDesignOverrides } from '../services/designOverrides.service.js';
import { UPLOAD_DIR } from '../middleware/upload.js';

// --- Admin activity backlog -------------------------------------------------
// Permanent log of admin actions, split into 'user_management' and
// 'store_management' categories. Called after each mutation succeeds.
// There's no update/delete route for this table on purpose, not even
// admins can edit or remove log entries.
async function logAdminActivity(adminUserId, category, action, message, metadata = null) {
  await query(
    `INSERT INTO admin_activity_log (admin_user_id, category, action, message, metadata) VALUES (?, ?, ?, ?, ?)`,
    [adminUserId, category, action, message, metadata ? JSON.stringify(metadata) : null],
  );
}

export const listAdminActivity = asyncHandler(async (req, res) => {
  const { category } = req.query;
  if (category && !['user_management', 'store_management'].includes(category)) {
    throw new HttpError(400, 'category must be "user_management" or "store_management".');
  }
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const rows = await query(
    `SELECT al.*, u.first_name, u.last_name
     FROM admin_activity_log al
     JOIN users u ON u.id = al.admin_user_id
     ${category ? 'WHERE al.category = ?' : ''}
     ORDER BY al.created_at DESC
     LIMIT ?`,
    category ? [category, limit] : [limit],
  );

  res.json({
    entries: rows.map((row) => ({
      id: row.id,
      category: row.category,
      action: row.action,
      message: row.message,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      adminName: `${row.first_name} ${row.last_name}`.trim(),
      createdAt: row.created_at,
    })),
  });
});

// --- Users -------------------------------------------------------------

export const listUsers = asyncHandler(async (req, res) => {
  const users = await query('SELECT * FROM users ORDER BY created_at DESC');
  res.json({ users: users.map((u) => ({ ...toPublicUser(u), isActive: Boolean(u.is_active), isVerified: Boolean(u.is_verified) })) });
});

export const createUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, employeeId, email, password, accessRole = 'user' } = req.body;
  if (!firstName || !lastName || !employeeId || !email || !password) {
    throw new HttpError(400, 'firstName, lastName, employeeId, email, and password are required.');
  }
  if (!['user', 'admin'].includes(accessRole)) throw new HttpError(400, 'accessRole must be "user" or "admin".');

  const passwordHash = bcrypt.hashSync(password, 10);
  // Set email_verified_at right away, unlike self-registration. An admin
  // creating the account directly is already trustworthy, no need to
  // verify email ownership for this path.
  const result = await query(
    `INSERT INTO users (first_name, last_name, employee_id, email, password_hash, access_role, email_verified_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [firstName, lastName, employeeId, email, passwordHash, accessRole],
  );
  const [user] = await query('SELECT * FROM users WHERE id = ?', [result.insertId]);
  await logAdminActivity(req.user.id, 'user_management', 'user_created', `Created user account: ${firstName} ${lastName} (${employeeId})`);
  res.status(201).json({ user: toPublicUser(user) });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, accessRole } = req.body;
  const fields = [];
  const params = [];
  const changedFields = [];
  if (firstName !== undefined) { fields.push('first_name = ?'); params.push(firstName); changedFields.push('name'); }
  if (lastName !== undefined) { fields.push('last_name = ?'); params.push(lastName); if (!changedFields.includes('name')) changedFields.push('name'); }
  if (email !== undefined) { fields.push('email = ?'); params.push(email); changedFields.push('email'); }
  if (accessRole !== undefined) {
    if (!['user', 'admin'].includes(accessRole)) throw new HttpError(400, 'accessRole must be "user" or "admin".');
    fields.push('access_role = ?'); params.push(accessRole); changedFields.push('role');
  }
  if (fields.length === 0) throw new HttpError(400, 'No fields to update.');

  params.push(req.params.id);
  await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
  const [user] = await query('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!user) throw new HttpError(404, 'User not found.');
  await logAdminActivity(req.user.id, 'user_management', 'user_updated', `Updated user: ${user.first_name} ${user.last_name} (${changedFields.join(', ')})`);
  res.json({ user: toPublicUser(user) });
});

export const setUserActive = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const [target] = await query('SELECT first_name, last_name FROM users WHERE id = ?', [req.params.id]);
  if (!target) throw new HttpError(404, 'User not found.');
  await query('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, req.params.id]);
  const name = `${target.first_name} ${target.last_name}`;
  await logAdminActivity(
    req.user.id,
    'user_management',
    isActive ? 'user_reactivated' : 'user_deactivated',
    `${isActive ? 'Reactivated' : 'Deactivated'} user: ${name}`,
  );
  res.json({ message: isActive ? 'User reactivated.' : 'User deactivated.' });
});

export const verifyUser = asyncHandler(async (req, res) => {
  const [target] = await query('SELECT first_name, last_name FROM users WHERE id = ?', [req.params.id]);
  if (!target) throw new HttpError(404, 'User not found.');
  await query('UPDATE users SET is_verified = 1, is_active = 1 WHERE id = ?', [req.params.id]);
  await logAdminActivity(req.user.id, 'user_management', 'user_verified', `Verified user account: ${target.first_name} ${target.last_name}`);
  res.json({ message: 'User verified.' });
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
  await logAdminActivity(req.user.id, 'store_management', 'brand_created', `Added brand: ${brand} (${materialName})`);
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
  await logAdminActivity(req.user.id, 'store_management', 'brand_updated', `Updated brand: ${material.brand} (${material.material_name})`);
  res.json({ material });
});

export const deleteMaterial = asyncHandler(async (req, res) => {
  const [target] = await query('SELECT brand, material_name FROM material_brands WHERE id = ?', [req.params.id]);
  await query('DELETE FROM material_brands WHERE id = ?', [req.params.id]);
  const label = target ? `${target.brand} (${target.material_name})` : `#${req.params.id}`;
  await logAdminActivity(req.user.id, 'store_management', 'brand_deleted', `Deleted brand: ${label}`);
  res.status(204).end();
});

// --- Stores ----------------------------------------------------------------

export const createStore = asyncHandler(async (req, res) => {
  const { name, address, lat, lng } = req.body;
  if (!name || !address || lat == null || lng == null) throw new HttpError(400, 'name, address, lat, and lng are required.');
  const result = await query('INSERT INTO stores (name, address, lat, lng) VALUES (?, ?, ?, ?)', [name, address, lat, lng]);
  const [store] = await query('SELECT * FROM stores WHERE id = ?', [result.insertId]);
  await logAdminActivity(req.user.id, 'store_management', 'store_created', `Added hardware store: ${name}`);
  res.status(201).json({ store });
});

export const updateStore = asyncHandler(async (req, res) => {
  const { name, address, lat, lng } = req.body;
  const fields = [];
  const params = [];
  const changedFields = [];
  const set = (col, val, label) => { if (val !== undefined) { fields.push(`${col} = ?`); params.push(val); changedFields.push(label); } };
  set('name', name, 'name');
  set('address', address, 'address');
  set('lat', lat, 'location');
  set('lng', lng, 'location');
  if (fields.length === 0) throw new HttpError(400, 'No fields to update.');

  params.push(req.params.id);
  await query(`UPDATE stores SET ${fields.join(', ')} WHERE id = ?`, params);
  const [store] = await query('SELECT * FROM stores WHERE id = ?', [req.params.id]);
  if (!store) throw new HttpError(404, 'Store not found.');
  const uniqueFields = [...new Set(changedFields)];
  await logAdminActivity(req.user.id, 'store_management', 'store_updated', `Updated store: ${store.name} (${uniqueFields.join(', ')})`);
  res.json({ store });
});

export const deleteStore = asyncHandler(async (req, res) => {
  const [target] = await query('SELECT name FROM stores WHERE id = ?', [req.params.id]);
  await query('DELETE FROM stores WHERE id = ?', [req.params.id]);
  await logAdminActivity(req.user.id, 'store_management', 'store_removed', `Removed hardware store: ${target?.name ?? `#${req.params.id}`}`);
  res.status(204).end();
});

// Deactivate/reactivate a store instead of deleting it. Deactivated stores
// drop out of Store Locator comparisons but stay editable in the Admin
// Module. Same idea as setUserActive above.
export const setStoreActive = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const [target] = await query('SELECT name FROM stores WHERE id = ?', [req.params.id]);
  if (!target) throw new HttpError(404, 'Store not found.');
  await query('UPDATE stores SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, req.params.id]);
  await logAdminActivity(
    req.user.id,
    'store_management',
    isActive ? 'store_reactivated' : 'store_deactivated',
    `${isActive ? 'Reactivated' : 'Deactivated'} hardware store: ${target.name}`,
  );
  res.json({ message: isActive ? 'Store reactivated.' : 'Store deactivated.' });
});

/** All global brands, left-joined with this store's own prices. `storePrice`/
 * `inStock` are null if this store hasn't priced that brand yet, that's how
 * the frontend tells "not stocked" apart from "already stocked". Grouped by
 * material key for the admin UI. */
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

function truthy(value, fallback) {
  if (value === undefined) return fallback;
  return value === true || value === 'true';
}

// Setting or changing a price needs a quotation file attached as proof
// (PDF/Word/Excel, see uploadQuotation in middleware/upload.js). The one
// exception is `usesCatalogPrice`, used when "Add materials to store" just
// copies a brand's existing catalog price, nothing was actually decided so
// there's nothing to prove.
export const upsertStoreMaterialPrice = asyncHandler(async (req, res) => {
  const { storeId, materialBrandId } = req.params;
  const { price, inStock } = req.body;
  if (price == null) throw new HttpError(400, 'price is required.');
  const usesCatalogPrice = truthy(req.body.usesCatalogPrice, false);
  if (!usesCatalogPrice && !req.file) {
    throw new HttpError(400, 'A quotation file (PDF, Word, or Excel) is required to set or change a price.');
  }

  const numericPrice = Number(price);
  const stockFlag = truthy(inStock, true);

  const [[store], [brand], [existing]] = await Promise.all([
    query('SELECT name FROM stores WHERE id = ?', [storeId]),
    query('SELECT brand, material_name FROM material_brands WHERE id = ?', [materialBrandId]),
    query('SELECT price FROM store_material_prices WHERE store_id = ? AND material_brand_id = ?', [storeId, materialBrandId]),
  ]);

  await query(
    `INSERT INTO store_material_prices (store_id, material_brand_id, price, in_stock)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE price = VALUES(price), in_stock = VALUES(in_stock)`,
    [storeId, materialBrandId, numericPrice, stockFlag ? 1 : 0],
  );

  const brandLabel = brand ? `${brand.brand} (${brand.material_name})` : `brand #${materialBrandId}`;
  const storeLabel = store?.name ?? `store #${storeId}`;
  const message = existing
    ? `Changed price of ${brandLabel} at ${storeLabel} from ₱${Number(existing.price).toFixed(2)} to ₱${numericPrice.toFixed(2)}`
    : `Set price of ${brandLabel} at ${storeLabel} to ₱${numericPrice.toFixed(2)}`;
  await logAdminActivity(req.user.id, 'store_management', 'store_price_changed', message, {
    storeId: Number(storeId),
    materialBrandId: Number(materialBrandId),
    previousPrice: existing ? Number(existing.price) : null,
    newPrice: numericPrice,
    inStock: stockFlag,
    ...(req.file ? { quotationStoredName: req.file.filename, quotationFileName: req.file.originalname } : {}),
  });

  res.json({ message: 'Store price saved.' });
});

export const removeStoreMaterialPrice = asyncHandler(async (req, res) => {
  const { storeId, materialBrandId } = req.params;
  const [[store], [brand]] = await Promise.all([
    query('SELECT name FROM stores WHERE id = ?', [storeId]),
    query('SELECT brand, material_name FROM material_brands WHERE id = ?', [materialBrandId]),
  ]);
  await query('DELETE FROM store_material_prices WHERE store_id = ? AND material_brand_id = ?', [storeId, materialBrandId]);
  const brandLabel = brand ? `${brand.brand} (${brand.material_name})` : `brand #${materialBrandId}`;
  await logAdminActivity(req.user.id, 'store_management', 'store_price_removed', `Unassigned ${brandLabel} from ${store?.name ?? `store #${storeId}`}`);
  res.status(204).end();
});

// Lets an admin download a quotation file from the Activity Log.
// `storedName` should always be a multer-generated filename, but we still
// block path separators just in case, so nobody can read files outside
// UPLOAD_DIR.
export const downloadQuotation = asyncHandler(async (req, res) => {
  const { storedName } = req.params;
  if (!storedName || /[/\\]/.test(storedName)) throw new HttpError(400, 'Invalid file name.');

  const filePath = path.join(UPLOAD_DIR, storedName);
  if (!fs.existsSync(filePath)) throw new HttpError(404, 'Quotation file not found.');

  const downloadName = req.query.name ? String(req.query.name) : storedName;
  res.download(filePath, downloadName);
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

  // ON DUPLICATE KEY UPDATE won't match a NULL project_id row (MySQL treats
  // every NULL as different), so we upsert manually here instead.
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

import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { toPublicUser } from '../utils/serializers.js';
import { HttpError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isValidPassword, PASSWORD_RULE_MESSAGE } from '../utils/passwordPolicy.js';
import { getEffectiveConstants } from '../services/constants.service.js';
import { generateUserId } from '../services/userId.service.js';
import { getDesignOverrides, saveDesignOverrides } from '../services/designOverrides.service.js';
import { UPLOAD_DIR } from '../middleware/upload.js';
import { cooldownSecondsLeft, issuePasswordResetCode, generateTemporaryPassword, TEMP_PASSWORD_HOURS } from '../services/passwordReset.service.js';
import { sendTemporaryPasswordNoticeEmail } from '../services/mailer.service.js';

// --- Admin activity log ---
// Permanent log of admin actions ('user_management' and 'store_management'),
// written after each successful change. There is no update or delete route on
// purpose, so even admins can't edit or remove entries.
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
  const { firstName, lastName, email, password, accessRole = 'user' } = req.body;
  if (!firstName || !lastName || !email || !password) {
    throw new HttpError(400, 'firstName, lastName, email, and password are required.');
  }
  if (!['user', 'admin'].includes(accessRole)) throw new HttpError(400, 'accessRole must be "user" or "admin".');
  if (!isValidPassword(password)) throw new HttpError(400, PASSWORD_RULE_MESSAGE);

  // Same as register: check the email before using up a User ID number.
  const [existing] = await query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) throw new HttpError(409, 'That email address is already in use.');

  const passwordHash = bcrypt.hashSync(password, 10);
  const userId = await generateUserId();
  // Set email_verified_at right away. An admin creating the account is trusted,
  // so no email check is needed.
  const result = await query(
    `INSERT INTO users (first_name, last_name, user_id, email, password_hash, access_role, email_verified_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [firstName, lastName, userId, email, passwordHash, accessRole],
  );
  const [user] = await query('SELECT * FROM users WHERE id = ?', [result.insertId]);
  await logAdminActivity(req.user.id, 'user_management', 'user_created', `Created user account: ${firstName} ${lastName} (${userId})`);
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

    // Promoting to admin is allowed. Demotion is guarded so an admin can't
    // demote themselves or the last admin and lock everyone out of the admin
    // module. The checks only run when the role changes to 'user'.
    if (accessRole === 'user') {
      const [current] = await query('SELECT access_role FROM users WHERE id = ?', [req.params.id]);
      if (current?.access_role === 'admin') {
        if (String(req.params.id) === String(req.user.id)) {
          throw new HttpError(403, 'You cannot remove your own admin role.');
        }
        // Backstop kept on purpose. The self-demotion check above already
        // covers every path today, but this matters if that rule is relaxed
        // or another code path starts setting roles.
        const [{ adminCount }] = await query(
          "SELECT COUNT(*) AS adminCount FROM users WHERE access_role = 'admin'",
        );
        if (adminCount <= 1) {
          throw new HttpError(403, 'This is the last admin account, so its role cannot be changed.');
        }
      }
    }

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
  const [target] = await query('SELECT first_name, last_name, access_role FROM users WHERE id = ?', [req.params.id]);
  if (!target) throw new HttpError(404, 'User not found.');
  // Admin accounts can't be deactivated, even by themselves, or an admin could
  // lock everyone out with one click. Checked on the server because hiding the
  // button in the UI does not block direct requests.
  if (target.access_role === 'admin') {
    throw new HttpError(403, 'Admin accounts cannot be deactivated. Change the role to user first.');
  }
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

// --- Password help for a user ---
// The admin never sees or picks the user's own password. "Send reset code"
// emails the normal Forgot password code. "Set temporary password" is for a
// user who can't open their email: the system makes a random one, shows it to
// the admin once, and the user must replace it at the next sign in.
async function loadPasswordTarget(req) {
  const [target] = await query('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!target) throw new HttpError(404, 'User not found.');
  if (!target.email_verified_at) {
    throw new HttpError(400, "This user hasn't verified their email yet, so they can't sign in. Verify the account first.");
  }
  if (!target.is_active) throw new HttpError(400, 'This account is deactivated. Reactivate it first.');
  return target;
}

export const sendUserResetCode = asyncHandler(async (req, res) => {
  const target = await loadPasswordTarget(req);
  const wait = cooldownSecondsLeft(target);
  if (wait > 0) throw new HttpError(429, `A code was just sent. Try again in ${wait} seconds.`);
  try {
    await issuePasswordResetCode(target, { byAdmin: true });
  } catch (err) {
    console.error('Failed to send admin reset code:', err);
    throw new HttpError(502, 'The email could not be sent. Check the address, or set a temporary password instead.');
  }
  await logAdminActivity(req.user.id, 'user_management', 'password_reset_code_sent',
    `Sent a password reset code to ${target.first_name} ${target.last_name} (${target.user_id})`);
  res.json({ message: `Reset code sent to ${target.email}.`, email: target.email });
});

export const setTemporaryPassword = asyncHandler(async (req, res) => {
  if (Number(req.params.id) === Number(req.user.id)) {
    throw new HttpError(400, 'Change your own password from Profile.');
  }
  const target = await loadPasswordTarget(req);
  const temporaryPassword = generateTemporaryPassword();
  // Clears any pending reset code, so only the temporary password works.
  await query(
    `UPDATE users SET password_hash = ?, must_change_password = 1,
                       temp_password_expires_at = NOW() + INTERVAL ${TEMP_PASSWORD_HOURS} HOUR,
                       password_reset_code = NULL, password_reset_expires_at = NULL, password_reset_attempts = 0
     WHERE id = ?`,
    [bcrypt.hashSync(temporaryPassword, 10), target.id],
  );
  await logAdminActivity(req.user.id, 'user_management', 'temporary_password_set',
    `Set a temporary password for ${target.first_name} ${target.last_name} (${target.user_id})`);
  // Not awaited: the user may not be able to open this inbox (that is why).
  sendTemporaryPasswordNoticeEmail(target.email, `${target.first_name} ${target.last_name}`.trim())
    .catch((err) => console.error('Could not send temporary password notice:', err.message));
  // Shown to the admin once; it is never stored in plain text or logged.
  res.json({ temporaryPassword, expiresInHours: TEMP_PASSWORD_HOURS });
});

export const verifyUser = asyncHandler(async (req, res) => {
  const [target] = await query('SELECT first_name, last_name FROM users WHERE id = ?', [req.params.id]);
  if (!target) throw new HttpError(404, 'User not found.');
  await query('UPDATE users SET is_verified = 1, is_active = 1 WHERE id = ?', [req.params.id]);
  await logAdminActivity(req.user.id, 'user_management', 'user_verified', `Verified user account: ${target.first_name} ${target.last_name}`);
  res.json({ message: 'User verified.' });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const [target] = await query('SELECT first_name, last_name, user_id, access_role FROM users WHERE id = ?', [req.params.id]);
  if (!target) throw new HttpError(404, 'User not found.');
  // Same rule as setUserActive: admin accounts can't be deactivated or deleted.
  // Deleting a user cascades to their projects and estimations (see schema.sql),
  // which is fine for regular users. But it would also cascade an admin's
  // admin_activity_log rows, which must stay permanent (007_admin_activity_log.sql).
  if (target.access_role === 'admin') {
    throw new HttpError(403, 'Admin accounts cannot be deleted. Change the role to user first, then delete.');
  }
  const name = `${target.first_name} ${target.last_name} (${target.user_id})`;
  await query('DELETE FROM users WHERE id = ?', [req.params.id]);
  await logAdminActivity(req.user.id, 'user_management', 'user_deleted', `Deleted user account: ${name}`);
  res.status(204).end();
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

// Deactivate or reactivate a store instead of deleting it. Deactivated stores
// drop out of Store Locator but stay editable in the Admin Module.
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

/** All global brands, left-joined with this store's own prices. `storePrice` and
 * `inStock` (and `stockQty`) are null if the store has not priced that brand, which is how the
 * frontend tells "not stocked" from "already stocked". Grouped by material key. */
export const getStoreCatalog = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT mb.id AS material_brand_id, mb.material_key, mb.material_name, mb.unit, mb.brand, mb.spec,
            mb.base_price, mb.quality, mb.category, mb.is_commodity,
            smp.price AS store_price, smp.in_stock AS store_in_stock, smp.stock_qty AS store_stock_qty
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
      stockQty: row.store_stock_qty == null ? null : Number(row.store_stock_qty),
    });
  }

  res.json({ catalog: [...byKey.values()] });
});

function truthy(value, fallback) {
  if (value === undefined) return fallback;
  return value === true || value === 'true';
}

// Stock count from the form. Blank clears it (unknown), not sent keeps the
// saved one.
function parseStockQty(value, saved) {
  if (value === undefined) return saved ?? null;
  if (value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new HttpError(400, 'Stock count must be 0 or more.');
  return n;
}

// Setting or changing a price needs a quotation file as proof (PDF/Word/Excel,
// see uploadQuotation in upload.js). The exceptions are `usesCatalogPrice`, used
// when "Add materials to store" just copies a catalog price, and saving the
// same price again (e.g. only the stock count changed).
export const upsertStoreMaterialPrice = asyncHandler(async (req, res) => {
  const { storeId, materialBrandId } = req.params;
  const { price, inStock } = req.body;
  if (price == null) throw new HttpError(400, 'price is required.');
  const numericPrice = Number(price);
  const stockFlag = truthy(inStock, true);

  const [[store], [brand], [existing]] = await Promise.all([
    query('SELECT name FROM stores WHERE id = ?', [storeId]),
    query('SELECT brand, material_name FROM material_brands WHERE id = ?', [materialBrandId]),
    query('SELECT price, stock_qty FROM store_material_prices WHERE store_id = ? AND material_brand_id = ?', [storeId, materialBrandId]),
  ]);

  const usesCatalogPrice = truthy(req.body.usesCatalogPrice, false);
  const priceUnchanged = existing && Number(existing.price) === numericPrice;
  if (!usesCatalogPrice && !priceUnchanged && !req.file) {
    throw new HttpError(400, 'A quotation file (PDF, Word, or Excel) is required to set or change a price.');
  }
  const stockQty = parseStockQty(req.body.stockQty, existing?.stock_qty == null ? null : Number(existing.stock_qty));

  await query(
    `INSERT INTO store_material_prices (store_id, material_brand_id, price, in_stock, stock_qty)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE price = VALUES(price), in_stock = VALUES(in_stock), stock_qty = VALUES(stock_qty)`,
    [storeId, materialBrandId, numericPrice, stockFlag ? 1 : 0, stockQty],
  );

  const brandLabel = brand ? `${brand.brand} (${brand.material_name})` : `brand #${materialBrandId}`;
  const storeLabel = store?.name ?? `store #${storeId}`;
  let message = `Set price of ${brandLabel} at ${storeLabel} to ₱${numericPrice.toFixed(2)}`;
  if (priceUnchanged) message = `Updated ${brandLabel} at ${storeLabel}, price unchanged at ₱${numericPrice.toFixed(2)}`;
  else if (existing) message = `Changed price of ${brandLabel} at ${storeLabel} from ₱${Number(existing.price).toFixed(2)} to ₱${numericPrice.toFixed(2)}`;
  await logAdminActivity(req.user.id, 'store_management', 'store_price_changed', message, {
    storeId: Number(storeId),
    materialBrandId: Number(materialBrandId),
    previousPrice: existing ? Number(existing.price) : null,
    newPrice: numericPrice,
    inStock: stockFlag,
    stockQty,
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

// Lets an admin download a quotation file from the Activity Log. `storedName`
// is a multer-generated name, but path separators are blocked anyway so
// nothing outside UPLOAD_DIR can be read.
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

  // ON DUPLICATE KEY UPDATE won't match a NULL project_id (MySQL treats every
  // NULL as different), so upsert manually.
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

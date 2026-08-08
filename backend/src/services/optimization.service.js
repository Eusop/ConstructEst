import { query } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';

async function getQuantityTakeoff(projectId) {
  const rows = await query(
    `SELECT eli.material_key, eli.name, eli.quantity, eli.unit
     FROM estimation_line_items eli
     JOIN estimation_results er ON er.id = eli.estimation_id
     WHERE er.project_id = ? AND er.is_current = 1`,
    [projectId],
  );
  if (rows.length === 0) {
    throw new HttpError(409, 'This project has no computed estimate yet.');
  }
  return rows;
}

/**
 * Table 20's per-store cost optimization: for each store, the cheapest
 * available brand per material is picked independently (no mixing brands
 * across stores) and summed. A material the store doesn't carry marks that
 * store as short one item and names an alternative store that has it —
 * matching FR-11's unavailability notification.
 */
export async function getStoreOptimization(projectId) {
  const materials = await getQuantityTakeoff(projectId);
  const stores = await query('SELECT * FROM stores ORDER BY name');

  const results = [];
  for (const store of stores) {
    let optimizedTotal = 0;
    const missingMaterials = [];

    for (const material of materials) {
      const [cheapest] = await query(
        `SELECT MIN(smp.price) AS price
         FROM store_material_prices smp
         JOIN material_brands mb ON mb.id = smp.material_brand_id
         WHERE smp.store_id = ? AND mb.material_key = ? AND smp.in_stock = 1`,
        [store.id, material.material_key],
      );

      if (cheapest?.price == null) {
        const [alternative] = await query(
          `SELECT s.id, s.name
           FROM store_material_prices smp
           JOIN material_brands mb ON mb.id = smp.material_brand_id
           JOIN stores s ON s.id = smp.store_id
           WHERE mb.material_key = ? AND smp.in_stock = 1 AND s.id != ?
           ORDER BY smp.price ASC LIMIT 1`,
          [material.material_key, store.id],
        );
        missingMaterials.push({
          materialKey: material.material_key,
          name: material.name,
          suggestedStoreId: alternative?.id ?? null,
          suggestedStoreName: alternative?.name ?? null,
        });
        continue;
      }

      optimizedTotal += Number(cheapest.price) * Number(material.quantity);
    }

    results.push({
      storeId: store.id,
      name: store.name,
      address: store.address,
      lat: Number(store.lat),
      lng: Number(store.lng),
      optimizedTotal: missingMaterials.length > 0 ? null : Math.round(optimizedTotal * 100) / 100,
      inStock: missingMaterials.length === 0,
      missingMaterials,
    });
  }

  const priced = results.filter((r) => r.optimizedTotal != null);
  const cheapestTotal = priced.length > 0 ? Math.min(...priced.map((r) => r.optimizedTotal)) : null;
  return results
    .map((r) => ({ ...r, isCheapest: r.optimizedTotal === cheapestTotal && cheapestTotal != null }))
    .sort((a, b) => (a.optimizedTotal ?? Infinity) - (b.optimizedTotal ?? Infinity));
}

/** Every brand option for one brand-selectable material at one store (feeds
 * Brand Selection's per-material dropdown / Automatic-mode tiers). */
export async function getBrandCatalog(projectId, storeId) {
  const materials = await getQuantityTakeoff(projectId);
  const catalog = {};

  for (const material of materials) {
    const options = await query(
      `SELECT mb.id, mb.brand, mb.spec, mb.quality, smp.price, s.name AS supplier
       FROM material_brands mb
       JOIN store_material_prices smp ON smp.material_brand_id = mb.id
       JOIN stores s ON s.id = smp.store_id
       WHERE mb.material_key = ? AND smp.store_id = ? AND mb.is_commodity = 0 AND smp.in_stock = 1
       ORDER BY smp.price ASC`,
      [material.material_key, storeId],
    );
    if (options.length > 0) {
      catalog[material.material_key] = options.map((o) => ({ ...o, price: Number(o.price) }));
    }
  }

  return catalog;
}

/**
 * Prices the full quantity take-off against one store: a saved brand choice
 * wins where one exists, otherwise the cheapest available brand at that
 * store is used (commodities like sand/gravel always use the store's flat
 * price, they have no brand choice).
 */
export async function computeBom(projectId, storeId) {
  const materials = await getQuantityTakeoff(projectId);
  const selections = await query(
    'SELECT material_key, material_brand_id FROM project_brand_selections WHERE project_id = ?',
    [projectId],
  );
  const selectionByKey = Object.fromEntries(selections.map((s) => [s.material_key, s.material_brand_id]));

  const lineItems = [];
  for (const material of materials) {
    let row;
    if (selectionByKey[material.material_key]) {
      [row] = await query(
        `SELECT mb.brand, mb.category, smp.price
         FROM store_material_prices smp
         JOIN material_brands mb ON mb.id = smp.material_brand_id
         WHERE smp.store_id = ? AND smp.material_brand_id = ?`,
        [storeId, selectionByKey[material.material_key]],
      );
    }
    if (!row) {
      [row] = await query(
        `SELECT mb.brand, mb.category, smp.price
         FROM store_material_prices smp
         JOIN material_brands mb ON mb.id = smp.material_brand_id
         WHERE smp.store_id = ? AND mb.material_key = ? AND smp.in_stock = 1
         ORDER BY smp.price ASC LIMIT 1`,
        [storeId, material.material_key],
      );
    }

    const unitPrice = row ? Number(row.price) : 0;
    lineItems.push({
      key: material.material_key,
      material: material.name,
      category: row?.category ?? null,
      brand: row?.brand ?? null,
      quantity: Number(material.quantity),
      unit: material.unit,
      unitPrice,
      amount: Math.round(unitPrice * Number(material.quantity) * 100) / 100,
    });
  }

  const grandTotal = Math.round(lineItems.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
  return { lineItems, grandTotal };
}

export async function saveBrandSelection(projectId, storeId, choices) {
  await query('UPDATE projects SET selected_store_id = ? WHERE id = ?', [storeId, projectId]);

  for (const [materialKey, materialBrandId] of Object.entries(choices)) {
    await query(
      `INSERT INTO project_brand_selections (project_id, material_key, material_brand_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE material_brand_id = VALUES(material_brand_id)`,
      [projectId, materialKey, materialBrandId],
    );
  }

  return computeBom(projectId, storeId);
}

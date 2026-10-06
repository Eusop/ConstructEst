import { query } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { getEffectiveDesignOverrides } from './designOverrides.service.js';

// Formwork (plywood, lumber) and scaffolding are reused across pours and
// projects, so their price is divided by a number of uses. Quantities stay the
// same. The engineers suggested about 3 uses for formwork and 4 for
// scaffolding (2026-10-03 meeting). Both are design parameters (migration
// 029): project value, then the admin default, then the defaults below.
const FORMWORK_KEYS = new Set(['plywood', 'lumber']);
const DEFAULT_FORMWORK_USES = 1;
const DEFAULT_SCAFFOLDING_USES = 4;
// What one set holds, from the engineer's example (same as formulas.py).
const SCAFFOLD_SET_PARTS = '1 set = 2 H-frames, 2 cross braces, 4 joint pins';

function usesFor(materialKey, reuse) {
  if (materialKey === 'scaffolding') return reuse.scaffoldingUses;
  if (FORMWORK_KEYS.has(materialKey)) return reuse.formworkUses;
  return 1;
}

function effectivePrice(materialKey, price, reuse) {
  const uses = usesFor(materialKey, reuse);
  return uses > 1 ? Math.round((price / uses) * 100) / 100 : price;
}

// Adds the reuse note, and for rebar the 6 m bars per size from the engine
// (estimation_line_items.bar_pieces), since stores sell rebar by the piece.
function effectiveSpec(materialKey, spec, reuse, barPieces = null) {
  const notes = [];
  const uses = usesFor(materialKey, reuse);
  if (materialKey === 'scaffolding') notes.push(SCAFFOLD_SET_PARTS);
  if (uses > 1) notes.push(`price / ${uses} uses`);
  if (materialKey === 'steelRebar' && Array.isArray(barPieces) && barPieces.length > 0) {
    notes.push(`6 m bars: ${barPieces.map((p) => `${p.diameterMm}mm ${p.pieces} pcs`).join(', ')}`);
  }
  return [spec, ...notes].filter(Boolean).join(', ') || spec;
}

async function getReuse(projectId) {
  const effective = await getEffectiveDesignOverrides(projectId);
  return {
    formworkUses: effective.formworkUses ?? DEFAULT_FORMWORK_USES,
    scaffoldingUses: effective.scaffoldingUses ?? DEFAULT_SCAFFOLDING_USES,
  };
}

function parseJson(value) {
  return typeof value === 'string' ? JSON.parse(value) : value;
}

// The take-off keeps lumber in board feet (Table 19) and the catalog prices it
// per board foot (migration 016), but stores sell it by the piece (e.g. 2x2x10).
// The BOM converts back to whole pieces using the size in the brand spec.
// Returns null when the spec has no readable size, so the line stays in bd.ft.
function boardFeetPerPiece(spec) {
  const match = /(\d+(?:\.\d+)?)\s*"?\s*x\s*(\d+(?:\.\d+)?)\s*"?\s*x\s*(\d+(?:\.\d+)?)\s*(?:ft|')?/i.exec(spec ?? '');
  if (!match) return null;
  const [thicknessIn, widthIn, lengthFt] = [match[1], match[2], match[3]].map(Number);
  const perPiece = (thicknessIn * widthIn * lengthFt) / 12;
  return perPiece > 0 ? perPiece : null;
}

// Cost of one take-off line, priced like computeBom (lumber in whole pieces),
// so the Store Locator total matches the BOM grand total.
function lineCost(materialKey, quantity, unitPrice, spec) {
  const perPiece = materialKey === 'lumber' ? boardFeetPerPiece(spec) : null;
  if (!perPiece) return unitPrice * quantity;
  return Math.ceil(quantity / perPiece) * (Math.round(unitPrice * perPiece * 100) / 100);
}

// Rebar is priced per 6 m bar of each size (migration 036), since stores sell
// it by the piece and sizes cost differently per kg. The take-off keeps rebar
// in tons; here that row is split into one row per size from its bar counts.
// Estimates saved without bar counts keep the per-ton row.
function splitRebarBySize(rows) {
  return rows.flatMap((row) => {
    const pieces = parseJson(row.bar_pieces);
    if (row.material_key !== 'steelRebar' || !Array.isArray(pieces) || pieces.length === 0) return [row];
    return pieces.map((piece) => ({
      material_key: `rebar${piece.diameterMm}mm`,
      name: `Rebar ${piece.diameterMm}mm`,
      quantity: piece.pieces,
      unit: 'pcs',
      bar_pieces: null,
    }));
  });
}

async function getQuantityTakeoff(projectId) {
  const rows = await query(
    `SELECT eli.material_key, eli.name, eli.quantity, eli.unit, eli.bar_pieces
     FROM estimation_line_items eli
     JOIN estimation_results er ON er.id = eli.estimation_id
     WHERE er.project_id = ? AND er.is_current = 1`,
    [projectId],
  );
  if (rows.length === 0) {
    throw new HttpError(409, 'This project has no computed estimate yet.');
  }
  return splitRebarBySize(rows);
}

/**
 * For each store, picks the cheapest available brand per material and sums
 * them (no mixing brands across stores). A store missing an item is flagged
 * and points to another store that has it.
 */
export async function getStoreOptimization(projectId) {
  const materials = await getQuantityTakeoff(projectId);
  const reuse = await getReuse(projectId);
  // Skip deactivated stores (they're closed, not just missing an item).
  const stores = await query('SELECT * FROM stores WHERE is_active = 1 ORDER BY name');

  const results = [];
  for (const store of stores) {
    let optimizedTotal = 0;
    const missingMaterials = [];

    for (const material of materials) {
      const [cheapest] = await query(
        `SELECT smp.price, mb.spec
         FROM store_material_prices smp
         JOIN material_brands mb ON mb.id = smp.material_brand_id
         WHERE smp.store_id = ? AND mb.material_key = ? AND smp.in_stock = 1
         ORDER BY smp.price ASC LIMIT 1`,
        [store.id, material.material_key],
      );

      if (cheapest?.price == null) {
        // Every other active store that carries it, since a store missing
        // several items may need a different alternative for each.
        const alternatives = await query(
          `SELECT DISTINCT s.id, s.name
           FROM store_material_prices smp
           JOIN material_brands mb ON mb.id = smp.material_brand_id
           JOIN stores s ON s.id = smp.store_id
           WHERE mb.material_key = ? AND smp.in_stock = 1 AND s.id != ? AND s.is_active = 1
           ORDER BY s.name`,
          [material.material_key, store.id],
        );
        missingMaterials.push({
          materialKey: material.material_key,
          name: material.name,
          availableAtStores: alternatives.map((s) => s.name),
        });
        continue;
      }

      optimizedTotal += lineCost(
        material.material_key,
        Number(material.quantity),
        effectivePrice(material.material_key, Number(cheapest.price), reuse),
        cheapest.spec,
      );
    }

    results.push({
      storeId: store.id,
      name: store.name,
      address: store.address,
      lat: Number(store.lat),
      lng: Number(store.lng),
      // Partial total for what this store does carry. It can still be shown
      // and selected, but not get the "cheapest" badge (see isCheapest below).
      optimizedTotal: Math.round(optimizedTotal * 100) / 100,
      inStock: missingMaterials.length === 0,
      missingMaterials,
    });
  }

  const priced = results.filter((r) => r.inStock);
  const cheapestTotal = priced.length > 0 ? Math.min(...priced.map((r) => r.optimizedTotal)) : null;
  return results
    .map((r) => ({ ...r, isCheapest: r.inStock && r.optimizedTotal === cheapestTotal && cheapestTotal != null }))
    // Fully stocked stores first (cheapest first), then partial ones. A partial
    // total is missing cost, so it should not outrank a complete one.
    .sort((a, b) => (a.inStock === b.inStock ? a.optimizedTotal - b.optimizedTotal : a.inStock ? -1 : 1));
}

/** Every brand option for one material at one store, feeds Brand
 * Selection's dropdowns and tier cards. */
export async function getBrandCatalog(projectId, storeId) {
  const materials = await getQuantityTakeoff(projectId);
  const reuse = await getReuse(projectId);
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
      catalog[material.material_key] = options.map((o) => ({
        ...o,
        spec: effectiveSpec(material.material_key, o.spec, reuse),
        price: effectivePrice(material.material_key, Number(o.price), reuse),
      }));
    }
  }

  return catalog;
}

/**
 * Every in-stock option for every material the project needs, at every active
 * store, grouped by store. Feeds the per-material supplier dropdown in Brand
 * Selection (Manual), so a material can be bought at another store. Includes
 * the bulk commodities (sand, gravel), which have no brand choice.
 */
export async function getAllStoreCatalog(projectId) {
  const materials = await getQuantityTakeoff(projectId);
  const reuse = await getReuse(projectId);
  const keys = materials.map((m) => m.material_key);
  const stores = await query('SELECT id, name FROM stores WHERE is_active = 1 ORDER BY name');
  const catalog = Object.fromEntries(stores.map((s) => [s.id, {}]));
  if (keys.length === 0) return { stores, catalog };

  const rows = await query(
    `SELECT mb.id, mb.material_key, mb.brand, mb.spec, mb.quality, mb.is_commodity, smp.price, smp.stock_qty,
            s.id AS store_id, s.name AS supplier
     FROM material_brands mb
     JOIN store_material_prices smp ON smp.material_brand_id = mb.id
     JOIN stores s ON s.id = smp.store_id
     WHERE s.is_active = 1 AND smp.in_stock = 1 AND mb.material_key IN (?)
     ORDER BY smp.price ASC`,
    [keys],
  );
  for (const row of rows) {
    const byKey = catalog[row.store_id];
    if (!byKey) continue;
    (byKey[row.material_key] ??= []).push({
      id: row.id,
      brand: row.brand,
      spec: effectiveSpec(row.material_key, row.spec, reuse),
      quality: row.quality,
      isCommodity: Boolean(row.is_commodity),
      price: effectivePrice(row.material_key, Number(row.price), reuse),
      supplier: row.supplier,
      storeId: row.store_id,
    });
  }
  return { stores, catalog };
}

async function getMaterialSuppliers(projectId) {
  const rows = await query('SELECT material_key, store_id, excluded FROM project_material_suppliers WHERE project_id = ?', [projectId]);
  return Object.fromEntries(rows.map((r) => [r.material_key, r.excluded ? 'none' : r.store_id]));
}

/**
 * Prices the full take-off. Each material is priced at its own supplier
 * (project_material_suppliers, migration 038), else at `storeId`, the
 * project's selected store; a material left out of the BOM is listed but not
 * priced. Uses the saved brand choice if that store has it, otherwise the
 * store's cheapest option. Sand/gravel just use the store's flat price since
 * they don't have brands.
 */
export async function computeBom(projectId, storeId) {
  const materials = await getQuantityTakeoff(projectId);
  const reuse = await getReuse(projectId);
  const suppliers = await getMaterialSuppliers(projectId);
  const storeNames = Object.fromEntries((await query('SELECT id, name FROM stores')).map((s) => [s.id, s.name]));
  const selections = await query(
    'SELECT material_key, material_brand_id FROM project_brand_selections WHERE project_id = ?',
    [projectId],
  );
  const selectionByKey = Object.fromEntries(selections.map((s) => [s.material_key, s.material_brand_id]));

  const lineItems = [];
  for (const material of materials) {
    // Left out of the BOM: shown in its own list, not priced.
    if (suppliers[material.material_key] === 'none') {
      lineItems.push({
        key: material.material_key, material: material.name, category: null, brand: null, spec: null,
        available: false, excluded: true, storeId: null, storeName: null,
        quantity: Number(material.quantity), unit: material.unit, unitPrice: null, amount: null, stockQty: null, stockShort: false,
      });
      continue;
    }
    const lineStoreId = Number(suppliers[material.material_key] ?? storeId);
    let row;
    if (selectionByKey[material.material_key]) {
      [row] = await query(
        `SELECT mb.brand, mb.category, mb.spec, smp.price, smp.stock_qty
         FROM store_material_prices smp
         JOIN material_brands mb ON mb.id = smp.material_brand_id
         WHERE smp.store_id = ? AND smp.material_brand_id = ?`,
        [lineStoreId, selectionByKey[material.material_key]],
      );
    }
    if (!row) {
      [row] = await query(
        `SELECT mb.brand, mb.category, mb.spec, smp.price, smp.stock_qty
         FROM store_material_prices smp
         JOIN material_brands mb ON mb.id = smp.material_brand_id
         WHERE smp.store_id = ? AND mb.material_key = ? AND smp.in_stock = 1
         ORDER BY smp.price ASC LIMIT 1`,
        [lineStoreId, material.material_key],
      );
    }

    // No row means the store carries no brand of this material. Flag it
    // instead of pricing it at 0 (see StoreLocatorPage and BomTable).
    const available = Boolean(row);
    let unitPrice = available ? effectivePrice(material.material_key, Number(row.price), reuse) : null;
    let quantity = Number(material.quantity);
    let unit = material.unit;
    let pieceConversion = null;
    // Stock count set by the admin, in the price unit. Null if not known.
    let stockQty = available && row.stock_qty != null ? Number(row.stock_qty) : null;

    const bdFtPerPiece = available && material.material_key === 'lumber' ? boardFeetPerPiece(row.spec) : null;
    if (bdFtPerPiece) {
      pieceConversion = { takeoffQuantity: quantity, takeoffUnit: unit, boardFeetPerPiece: Math.round(bdFtPerPiece * 1000) / 1000 };
      quantity = Math.ceil(quantity / bdFtPerPiece);
      if (stockQty != null) stockQty = Math.floor(stockQty / bdFtPerPiece);
      unitPrice = Math.round(unitPrice * bdFtPerPiece * 100) / 100;
      unit = 'pcs';
    }

    lineItems.push({
      key: material.material_key,
      material: material.name,
      storeId: lineStoreId,
      storeName: storeNames[lineStoreId] ?? null,
      excluded: false,
      category: row?.category ?? null,
      brand: row?.brand ?? null,
      spec: available ? effectiveSpec(material.material_key, row.spec, reuse, parseJson(material.bar_pieces)) : null,
      available,
      quantity,
      unit,
      unitPrice,
      amount: available ? Math.round(unitPrice * quantity * 100) / 100 : null,
      stockQty,
      stockShort: stockQty != null && stockQty < quantity,
      ...(pieceConversion ? { pieceConversion } : {}),
    });
  }

  const grandTotal = Math.round(lineItems.reduce((sum, item) => sum + (item.amount ?? 0), 0) * 100) / 100;
  // One entry per store the BOM buys from, the selected store first.
  const storeIds = [...new Set(lineItems.filter((item) => !item.excluded).map((item) => item.storeId))]
    .sort((a, b) => (a === Number(storeId) ? -1 : b === Number(storeId) ? 1 : 0));
  const suppliersSummary = storeIds.map((id) => {
    const items = lineItems.filter((item) => !item.excluded && item.storeId === id);
    return {
      storeId: id,
      name: storeNames[id] ?? null,
      itemCount: items.length,
      subtotal: Math.round(items.reduce((sum, item) => sum + (item.amount ?? 0), 0) * 100) / 100,
    };
  });
  return { lineItems, grandTotal, suppliers: suppliersSummary, excludedCount: lineItems.filter((item) => item.excluded).length, ...reuse };
}

/**
 * @param {Record<string, number>} choices materialKey -> material_brand_id
 * @param {Record<string, number|'none'>|undefined} suppliers materialKey -> another
 *   store id, or 'none' to leave it out of the BOM. Omitted keys (and the
 *   selected store itself) mean the selected store. Undefined keeps the saved ones.
 */
export async function saveBrandSelection(projectId, storeId, choices, suppliers) {
  await query('UPDATE projects SET selected_store_id = ? WHERE id = ?', [storeId, projectId]);

  if (suppliers !== undefined) {
    await query('DELETE FROM project_material_suppliers WHERE project_id = ?', [projectId]);
    for (const [materialKey, value] of Object.entries(suppliers ?? {})) {
      if (value === 'none') {
        await query('INSERT INTO project_material_suppliers (project_id, material_key, store_id, excluded) VALUES (?, ?, NULL, 1)', [projectId, materialKey]);
      } else if (value != null && Number(value) !== Number(storeId)) {
        await query('INSERT INTO project_material_suppliers (project_id, material_key, store_id, excluded) VALUES (?, ?, ?, 0)', [projectId, materialKey, Number(value)]);
      }
    }
  }

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

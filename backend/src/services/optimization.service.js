import { query } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';

// Scaffolding is bought new at retail (canvass: no rental or used rate exists,
// and the engineer confirmed contractors price per lot), but a frame set is
// reused across projects, so charging one project the full purchase price
// overstates its cost. Engr. Espiritu: assuming a number of projects to
// recover the investment is acceptable. The default of 10 uses is our own
// assumption, not an expert-validated figure; set it per deployment with the
// SCAFFOLDING_REUSE_COUNT env var. Quantities are untouched, only the price
// read at every pricing site below goes through effectivePrice().
const SCAFFOLDING_REUSE_COUNT = Number(process.env.SCAFFOLDING_REUSE_COUNT) || 10;

function effectivePrice(materialKey, price) {
  if (materialKey !== 'scaffolding') return price;
  return Math.round((price / SCAFFOLDING_REUSE_COUNT) * 100) / 100;
}

function effectiveSpec(materialKey, spec) {
  if (materialKey !== 'scaffolding') return spec;
  return `${spec ?? ''}, price / ${SCAFFOLDING_REUSE_COUNT} uses`.replace(/^, /, '');
}

// The take-off keeps lumber in board feet (Table 19: formwork area x 3 bd.ft
// per m2, expert-validated), and the catalog stores its price per board foot
// (migration 016), but hardware stores sell it by the piece in a stated size
// (e.g. 2x2x10). The procurement BOM converts back to whole pieces using the
// size in the brand's spec, so it lists something a store can actually be
// asked for. Returns null when the spec has no readable size, in which case
// the line stays in board feet.
function boardFeetPerPiece(spec) {
  const match = /(\d+(?:\.\d+)?)\s*"?\s*x\s*(\d+(?:\.\d+)?)\s*"?\s*x\s*(\d+(?:\.\d+)?)\s*(?:ft|')?/i.exec(spec ?? '');
  if (!match) return null;
  const [thicknessIn, widthIn, lengthFt] = [match[1], match[2], match[3]].map(Number);
  const perPiece = (thicknessIn * widthIn * lengthFt) / 12;
  return perPiece > 0 ? perPiece : null;
}

// Cost of one take-off line, priced the same way computeBom prices its BOM
// line (lumber in whole pieces), so the Store Locator's total and the BOM's
// grand total keep agreeing.
function lineCost(materialKey, quantity, unitPrice, spec) {
  const perPiece = materialKey === 'lumber' ? boardFeetPerPiece(spec) : null;
  if (!perPiece) return unitPrice * quantity;
  return Math.ceil(quantity / perPiece) * (Math.round(unitPrice * perPiece * 100) / 100);
}

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
 * For each store, picks the cheapest available brand per material and
 * sums it up (no mixing brands across stores). If a store doesn't carry
 * something, it's flagged as missing that item and points to another
 * store that has it.
 */
export async function getStoreOptimization(projectId) {
  const materials = await getQuantityTakeoff(projectId);
  // Skip deactivated stores entirely, they're not just missing an item,
  // they're closed for business right now.
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
        // Every other active store that actually carries it, not just the
        // cheapest one — a store missing several items may need a
        // different alternative per item, and showing only one option
        // understates what's actually available.
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
        effectivePrice(material.material_key, Number(cheapest.price)),
        cheapest.spec,
      );
    }

    results.push({
      storeId: store.id,
      name: store.name,
      address: store.address,
      lat: Number(store.lat),
      lng: Number(store.lng),
      // Partial total for whatever this store *does* carry — a store
      // missing something is still worth showing/selecting, just not
      // eligible for the "cheapest" badge (see isCheapest below), since its
      // total is missing whatever the gap item would have cost.
      optimizedTotal: Math.round(optimizedTotal * 100) / 100,
      inStock: missingMaterials.length === 0,
      missingMaterials,
    });
  }

  const priced = results.filter((r) => r.inStock);
  const cheapestTotal = priced.length > 0 ? Math.min(...priced.map((r) => r.optimizedTotal)) : null;
  return results
    .map((r) => ({ ...r, isCheapest: r.inStock && r.optimizedTotal === cheapestTotal && cheapestTotal != null }))
    // Fully-stocked stores first (cheapest-first among themselves), then
    // partially-stocked ones after (also cheapest-first among themselves) —
    // a partial total is missing cost, so it shouldn't be able to outrank a
    // complete one just for being numerically lower.
    .sort((a, b) => (a.inStock === b.inStock ? a.optimizedTotal - b.optimizedTotal : a.inStock ? -1 : 1));
}

/** Every brand option for one material at one store, feeds Brand
 * Selection's dropdowns and tier cards. */
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
      catalog[material.material_key] = options.map((o) => ({
        ...o,
        spec: effectiveSpec(material.material_key, o.spec),
        price: effectivePrice(material.material_key, Number(o.price)),
      }));
    }
  }

  return catalog;
}

/**
 * Prices the full take-off at one store. Uses the saved brand choice if
 * there is one, otherwise picks the cheapest option. Sand/gravel just use
 * the store's flat price since they don't have brands.
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
        `SELECT mb.brand, mb.category, mb.spec, smp.price
         FROM store_material_prices smp
         JOIN material_brands mb ON mb.id = smp.material_brand_id
         WHERE smp.store_id = ? AND smp.material_brand_id = ?`,
        [storeId, selectionByKey[material.material_key]],
      );
    }
    if (!row) {
      [row] = await query(
        `SELECT mb.brand, mb.category, mb.spec, smp.price
         FROM store_material_prices smp
         JOIN material_brands mb ON mb.id = smp.material_brand_id
         WHERE smp.store_id = ? AND mb.material_key = ? AND smp.in_stock = 1
         ORDER BY smp.price ASC LIMIT 1`,
        [storeId, material.material_key],
      );
    }

    // No row at all means this store doesn't carry any brand of this
    // material — distinct from a genuinely free material, so it's flagged
    // rather than silently priced at ₱0 (see StoreLocatorPage/BomTable,
    // which let a partially-stocked store be selected and need to show
    // this honestly instead).
    const available = Boolean(row);
    let unitPrice = available ? effectivePrice(material.material_key, Number(row.price)) : null;
    let quantity = Number(material.quantity);
    let unit = material.unit;
    let pieceConversion = null;

    const bdFtPerPiece = available && material.material_key === 'lumber' ? boardFeetPerPiece(row.spec) : null;
    if (bdFtPerPiece) {
      pieceConversion = { takeoffQuantity: quantity, takeoffUnit: unit, boardFeetPerPiece: Math.round(bdFtPerPiece * 1000) / 1000 };
      quantity = Math.ceil(quantity / bdFtPerPiece);
      unitPrice = Math.round(unitPrice * bdFtPerPiece * 100) / 100;
      unit = 'pcs';
    }

    lineItems.push({
      key: material.material_key,
      material: material.name,
      category: row?.category ?? null,
      brand: row?.brand ?? null,
      spec: available ? effectiveSpec(material.material_key, row.spec) : null,
      available,
      quantity,
      unit,
      unitPrice,
      amount: available ? Math.round(unitPrice * quantity * 100) / 100 : null,
      ...(pieceConversion ? { pieceConversion } : {}),
    });
  }

  const grandTotal = Math.round(lineItems.reduce((sum, item) => sum + (item.amount ?? 0), 0) * 100) / 100;
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

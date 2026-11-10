import { query } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { getStoreOptimization } from './optimization.service.js';
import { runPreviewEngine } from './engine.service.js';

// Explore Projects (panel recommendation, Nov 3 2026 defense): find shared
// projects most like a given size, by floor area, storeys and budget ceiling,
// ranked by the user. Rule-based: a weighted closeness score, no AI. A project
// only appears if its owner shared it (migration 046) and it is Complete
// (brand selection saved). The project name is shown, never the owner or location.
export const SIMILARITY_PARAMS = ['area', 'storeys', 'budget'];
const RANK_WEIGHTS = [3, 2, 1]; // 1st, 2nd and 3rd most important
export const EXPLORE_PAGE_SIZE = 10;
// Shown with each project so the user can compare sizes at a glance.
const KEY_MATERIALS = ['hollowBlocks', 'cement', 'steelRebar'];

// 1 when equal, lower the further apart: 100 vs 80 gives 0.8.
export function closeness(a, b) {
  const x = Number(a), y = Number(b);
  if (!(x > 0) || !(y > 0)) return 0;
  return 1 - Math.abs(x - y) / Math.max(x, y);
}

// "area,storeys,budget" -> the same as an array. Must name all 3 once.
export function parseOrder(raw) {
  if (raw == null || raw === '') return [...SIMILARITY_PARAMS];
  const order = String(raw).split(',').map((p) => p.trim());
  const valid = order.length === 3 && SIMILARITY_PARAMS.every((p) => order.includes(p));
  if (!valid) throw new HttpError(400, 'order must list area, storeys and budget once each, most important first.');
  return order;
}

const VALUE_OF = { area: 'floorArea', storeys: 'storeys', budget: 'budgetCeiling' };

// Match score from 0 to 100 and the closeness of each parameter. A parameter
// the target leaves out (null) is skipped and its weight not counted.
export function matchScore(target, other, order) {
  const parts = {
    area: closeness(target.floorArea, other.floorArea),
    storeys: Number(target.storeys) === Number(other.storeys) ? 1 : 0,
    budget: closeness(target.budgetCeiling, other.budgetCeiling),
  };
  let total = 0, weightSum = 0;
  order.forEach((param, i) => {
    if (target[VALUE_OF[param]] == null) return;
    total += RANK_WEIGHTS[i] * parts[param];
    weightSum += RANK_WEIGHTS[i];
  });
  return { score: weightSum ? Math.round((total / weightSum) * 1000) / 10 : 0, parts };
}

const LATEST_CURRENT = `er.id = (SELECT e.id FROM estimation_results e WHERE e.project_id = p.id AND e.is_current = 1
                                 ORDER BY e.computed_at DESC, e.id DESC LIMIT 1)`;
// Same as the Complete tag on the Projects page: a brand selection was saved.
const COMPLETE = 'EXISTS(SELECT 1 FROM project_brand_selections b WHERE b.project_id = p.id)';

// Shared Complete projects with a current estimate.
async function sharedProjects() {
  return query(
    `SELECT p.id, p.user_id, p.project_name, p.storeys, p.budget_ceiling, p.share_floor_plan, p.shared_at,
            er.id AS estimation_id, er.floor_area
     FROM projects p JOIN estimation_results er ON er.project_id = p.id
     WHERE p.status = 'parsed' AND p.share_in_explore = 1 AND er.floor_area > 0 AND ${COMPLETE} AND ${LATEST_CURRENT}`,
  );
}

const specsOf = (row) => ({ floorArea: Number(row.floor_area), storeys: row.storeys, budgetCeiling: Number(row.budget_ceiling) });

// What a card shows: project name, size label, specs, cost at today's prices, key quantities.
async function describe(row, viewerId) {
  const specs = specsOf(row);
  const items = await query(
    'SELECT material_key, name, quantity, unit FROM estimation_line_items WHERE estimation_id = ? AND material_key IN (?)',
    [row.estimation_id, KEY_MATERIALS],
  );
  // Cheapest store that sells every material, at today's prices, so every
  // project is priced the same way.
  const stores = await getStoreOptimization(row.id);
  const best = stores.find((s) => s.isCheapest) ?? null;
  return {
    projectName: row.project_name,
    label: `${specs.storeys}-storey house · ${Math.round(specs.floorArea)} m²`,
    ...specs,
    estimatedTotal: best ? best.optimizedTotal : null,
    costPerSqm: best ? Math.round((best.optimizedTotal / specs.floorArea) * 100) / 100 : null,
    storeName: best ? best.name : null,
    quantities: KEY_MATERIALS
      .map((key) => items.find((it) => it.material_key === key))
      .filter(Boolean)
      .map((it) => ({ key: it.material_key, name: it.name, quantity: Number(it.quantity), unit: it.unit })),
    hasFloorPlan: Boolean(row.share_floor_plan),
    isYours: row.user_id === viewerId,
  };
}

function rank(target, rows, order) {
  return rows
    .map((row) => ({ row, ...matchScore(target, specsOf(row), order) }))
    // Best score first; ties go to the closer floor area, then the newer project.
    .sort((a, b) => b.score - a.score || b.parts.area - a.parts.area || b.row.id - a.row.id);
}

// Search values from the query string. Blank means "not used".
function parseSearch(q) {
  const num = (v, name) => {
    if (v == null || v === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) throw new HttpError(400, `${name} must be a number above 0.`);
    return n;
  };
  const storeys = q.storeys == null || q.storeys === '' ? null : Number(q.storeys);
  if (storeys !== null && ![1, 2].includes(storeys)) throw new HttpError(400, 'storeys must be 1 or 2.');
  return { floorArea: num(q.area, 'area'), storeys, budgetCeiling: num(q.budget, 'budget') };
}

/**
 * Explore feed: shared projects (everyone's, the viewer's included). With a
 * search, sorted by match %; without one, newest shared first. 10 per page.
 */
export async function exploreProjects(viewerId, q) {
  const target = parseSearch(q);
  const order = parseOrder(q.order);
  const page = Math.max(1, Math.floor(Number(q.page) || 1));
  const searching = Object.values(target).some((v) => v != null);
  const rows = await sharedProjects();
  const ranked = searching
    ? rank(target, rows, order)
    : rows.sort((a, b) => new Date(b.shared_at ?? 0) - new Date(a.shared_at ?? 0) || b.id - a.id).map((row) => ({ row }));
  const slice = ranked.slice((page - 1) * EXPLORE_PAGE_SIZE, page * EXPLORE_PAGE_SIZE);
  const items = [];
  for (const m of slice) {
    items.push({
      id: m.row.id,
      ...(searching ? { matchPercent: m.score } : {}),
      ...(await describe(m.row, viewerId)),
    });
  }
  return { total: ranked.length, page, pageSize: EXPLORE_PAGE_SIZE, searching, order, items };
}

// A shared Complete project (or the viewer's own), or 404 so others stay hidden.
async function loadVisible(id, viewerId) {
  const [row] = await query(
    `SELECT p.id, p.user_id, p.project_name, p.storeys, p.budget_ceiling, p.share_in_explore, ${COMPLETE} AS is_complete, p.share_floor_plan, p.shared_at,
            p.dxf_file_path, p.second_floor_dxf_path, p.floor_plan_preview, er.id AS estimation_id, er.floor_area
     FROM projects p JOIN estimation_results er ON er.project_id = p.id
     WHERE p.id = ? AND p.status = 'parsed' AND ${LATEST_CURRENT}`,
    [id],
  );
  if (!row || (row.user_id !== viewerId && !(row.share_in_explore && row.is_complete))) throw new HttpError(404, 'This project is not shared.');
  return row;
}

/** Explore detail: full material list and every store's total. */
export async function exploreProjectDetail(id, viewerId) {
  const row = await loadVisible(id, viewerId);
  const materials = await query(
    'SELECT material_key AS `key`, name, quantity, unit FROM estimation_line_items WHERE estimation_id = ? ORDER BY id',
    [row.estimation_id],
  );
  const stores = await getStoreOptimization(row.id);
  return {
    id: row.id,
    ...(await describe(row, viewerId)),
    materials: materials.map((m) => ({ ...m, quantity: Number(m.quantity) })),
    stores: stores.map((s) => ({ name: s.name, total: s.optimizedTotal, complete: s.inStock, missing: s.missingMaterials.map((x) => x.name), recommended: s.isCheapest })),
  };
}

/**
 * Floor plan lines and shapes (no text), only if the owner shared the floor
 * plan. Built once from the saved DXF with engine/preview.py, then cached.
 */
export async function exploreFloorPlan(id, viewerId) {
  const row = await loadVisible(id, viewerId);
  if (!row.share_floor_plan && row.user_id !== viewerId) throw new HttpError(404, 'The owner did not share the floor plan.');
  const cached = typeof row.floor_plan_preview === 'string' ? JSON.parse(row.floor_plan_preview) : row.floor_plan_preview;
  if (cached) return cached;
  const preview = { ground: await runPreviewEngine({ dxfPath: row.dxf_file_path }) };
  if (row.second_floor_dxf_path) preview.second = await runPreviewEngine({ dxfPath: row.second_floor_dxf_path }).catch(() => null);
  await query('UPDATE projects SET floor_plan_preview = ? WHERE id = ?', [JSON.stringify(preview), row.id]);
  return preview;
}

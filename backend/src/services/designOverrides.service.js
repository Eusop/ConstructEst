import { query } from '../config/db.js';

// [apiKey, dbColumn] — apiKey is what the frontend/engine use (camelCase,
// matches engine/formulas.py's `overrides.get("columnWidth", ...)` calls),
// dbColumn is the project_design_overrides column it's stored in.
const FIELDS = [
  ['columnWidth', 'column_width'],
  ['columnDepth', 'column_depth'],
  ['columnHeight', 'column_height'],
  ['columnCount', 'column_count'],
  ['beamWidth', 'beam_width'],
  ['beamDepth', 'beam_depth'],
  ['beamLength', 'beam_length'],
  ['footingWidth', 'footing_width'],
  ['footingLength', 'footing_length'],
  ['footingDepth', 'footing_depth'],
  ['floorToFloorHeight', 'floor_to_floor_height'],
  ['stairWidth', 'stair_width'],
  ['buildingHeight', 'building_height'],
];

function toApiShape(row) {
  const shape = {};
  for (const [apiKey, dbColumn] of FIELDS) {
    const value = row ? row[dbColumn] : null;
    shape[apiKey] = value === null || value === undefined ? null : Number(value);
  }
  return shape;
}

/** `projectId === null` reads the admin-managed global default row. */
async function fetchRow(projectId) {
  const rows = projectId == null
    ? await query('SELECT * FROM project_design_overrides WHERE project_id IS NULL')
    : await query('SELECT * FROM project_design_overrides WHERE project_id = ?', [projectId]);
  return rows[0];
}

/** Every field defaults to null ("use the engine's built-in default") when
 * this project (or, for `projectId === null`, the admin) has never saved
 * overrides. Used as-is by the project-level GET/PUT endpoints, which
 * intentionally show only what's explicitly set for that project (see
 * DesignParametersCard's "Auto" placeholder) — the global default is kept
 * out of this so it doesn't look like a project-specific choice. */
export async function getDesignOverrides(projectId) {
  return toApiShape(await fetchRow(projectId));
}

/** Resolves what the engine should actually use for a project: each of the
 * 13 fields independently falls back project -> admin global default ->
 * (left null, letting formulas.py's own hardcoded default apply). Used
 * only when actually running the engine (createProject/recomputeEstimation),
 * never for display. */
export async function getEffectiveDesignOverrides(projectId) {
  const [projectRow, globalRow] = await Promise.all([fetchRow(projectId), fetchRow(null)]);
  const project = toApiShape(projectRow);
  const global = toApiShape(globalRow);
  const effective = {};
  for (const [apiKey] of FIELDS) {
    effective[apiKey] = project[apiKey] ?? global[apiKey] ?? null;
  }
  return effective;
}

/** Upserts the full override set for a project, or (projectId === null) the
 * admin's global default row. Project rows use a plain ON DUPLICATE KEY
 * UPDATE (project_id is a real, unique, non-null value there); the global
 * row can't — MySQL's unique indexes treat every NULL as distinct, so
 * ON DUPLICATE KEY UPDATE would never match an existing project_id IS NULL
 * row — so that path upserts explicitly instead (same gotcha as
 * admin.controller.js's updateGlobalConstants). */
export async function saveDesignOverrides(projectId, overrides) {
  const columns = FIELDS.map(([, dbColumn]) => dbColumn);
  const values = FIELDS.map(([apiKey]) => {
    const value = overrides[apiKey];
    return value === undefined || value === null || value === '' ? null : Number(value);
  });

  if (projectId == null) {
    const existing = await fetchRow(null);
    if (existing) {
      const setClause = columns.map((col) => `${col} = ?`).join(', ');
      await query(`UPDATE project_design_overrides SET ${setClause} WHERE id = ?`, [...values, existing.id]);
    } else {
      const placeholders = columns.map(() => '?').join(', ');
      await query(
        `INSERT INTO project_design_overrides (project_id, ${columns.join(', ')}) VALUES (NULL, ${placeholders})`,
        values,
      );
    }
    return getDesignOverrides(null);
  }

  const placeholders = columns.map(() => '?').join(', ');
  const updateClause = columns.map((col) => `${col} = VALUES(${col})`).join(', ');
  await query(
    `INSERT INTO project_design_overrides (project_id, ${columns.join(', ')})
     VALUES (?, ${placeholders})
     ON DUPLICATE KEY UPDATE ${updateClause}`,
    [projectId, ...values],
  );

  return getDesignOverrides(projectId);
}

/** Strips null fields so the Python engine only sees keys that resolved to
 * a real value — everything else falls through to formulas.py's own
 * hardcoded defaults. */
export function toEngineOverrides(apiShapeOverrides) {
  const engineOverrides = {};
  for (const [apiKey] of FIELDS) {
    const value = apiShapeOverrides[apiKey];
    if (value !== null && value !== undefined) engineOverrides[apiKey] = value;
  }
  return engineOverrides;
}

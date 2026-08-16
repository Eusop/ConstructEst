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

/** Every field defaults to null ("use the engine's built-in default") when
 * a project has never had overrides saved. */
export async function getDesignOverrides(projectId) {
  const [row] = await query('SELECT * FROM project_design_overrides WHERE project_id = ?', [projectId]);
  return toApiShape(row);
}

/** Upserts the full override set for a project — project_id is UNIQUE and
 * NOT NULL here (unlike estimation_constants' nullable global row), so a
 * plain ON DUPLICATE KEY UPDATE is safe. */
export async function saveDesignOverrides(projectId, overrides) {
  const columns = FIELDS.map(([, dbColumn]) => dbColumn);
  const values = FIELDS.map(([apiKey]) => {
    const value = overrides[apiKey];
    return value === undefined || value === null || value === '' ? null : Number(value);
  });

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

/** Strips null fields so the Python engine only sees keys the user actually
 * set — everything else falls through to formulas.py's own defaults. */
export function toEngineOverrides(apiShapeOverrides) {
  const engineOverrides = {};
  for (const [apiKey] of FIELDS) {
    const value = apiShapeOverrides[apiKey];
    if (value !== null && value !== undefined) engineOverrides[apiKey] = value;
  }
  return engineOverrides;
}

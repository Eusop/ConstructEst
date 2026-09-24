import { query } from '../config/db.js';

// [apiKey, dbColumn] pairs. apiKey is the camelCase name used by the
// frontend/engine, dbColumn is the actual column name in the table.
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
  ['scaffoldingSetWidth', 'scaffolding_set_width'],
  ['scaffoldingSetHeight', 'scaffolding_set_height'],
  ['riserHeight', 'riser_height'],
  ['treadDepth', 'tread_depth'],
  ['waistThickness', 'waist_thickness'],
  ['stairRebarSpacing', 'stair_rebar_spacing'],
  ['scaffoldingSetCount', 'scaffolding_set_count'],
  ['columnWidthSecond', 'column_width_second'],
  ['columnDepthSecond', 'column_depth_second'],
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

/** Every field is null if this project (or the admin, for projectId ===
 * null) never saved overrides for it. Only shows what's explicitly set for
 * that project, doesn't mix in the global default (see the "Auto"
 * placeholder in DesignParametersCard). */
export async function getDesignOverrides(projectId) {
  return toApiShape(await fetchRow(projectId));
}

/** Figures out what the engine should actually use, each field falls back
 * from project override to global default to formulas.py's own hardcoded
 * default. Only used when actually running the engine, not for display. */
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

/** Saves the override set for a project, or the admin's global default row
 * if projectId is null. Project rows can use ON DUPLICATE KEY UPDATE
 * normally, but the global row can't (MySQL treats every NULL as unique),
 * so that one's upserted by hand instead. */
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

/** Strips out null fields so the Python engine only gets keys with a real
 * value, everything else falls back to formulas.py's own defaults. */
export function toEngineOverrides(apiShapeOverrides) {
  const engineOverrides = {};
  for (const [apiKey] of FIELDS) {
    const value = apiShapeOverrides[apiKey];
    if (value !== null && value !== undefined) engineOverrides[apiKey] = value;
  }
  return engineOverrides;
}

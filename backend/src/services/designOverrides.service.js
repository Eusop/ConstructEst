import { query } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';

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
  ['footingThickness', 'footing_thickness'],
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
  ['beamRebarLength', 'beam_rebar_length'],
  ['beamRebarDiameterMm', 'beam_rebar_diameter_mm'],
  // From the plan, per the engineers (2026-10-03 meeting, migration 027).
  ['footingCount', 'footing_count'],
  ['footingRebarKgPerM3', 'footing_rebar_kg_per_m3'],
  ['groundSlabBarMm', 'ground_slab_bar_mm'],
  ['groundSlabBarSpacing', 'ground_slab_bar_spacing'],
  ['secondSlabBarMm', 'second_slab_bar_mm'],
  ['secondSlabBarSpacing', 'second_slab_bar_spacing'],
  ['columnBarCount', 'column_bar_count'],
  ['columnBarMm', 'column_bar_mm'],
  ['columnTieSpacing', 'column_tie_spacing'],
  ['beamStirrupSpacing', 'beam_stirrup_spacing'],
  ['beamStirrupMm', 'beam_stirrup_mm'],
  // Price only, read by optimization.service.js (migration 029).
  ['formworkUses', 'formwork_uses'],
  ['scaffoldingUses', 'scaffolding_uses'],
];

// Bar sizes stop at 16mm, the largest Tarlac stores usually carry, and a
// spacing under 5 cm is a typo (engineers, 2026-10-03 meeting).
const BAR_SIZE_KEYS = ['beamRebarDiameterMm', 'groundSlabBarMm', 'secondSlabBarMm', 'columnBarMm', 'beamStirrupMm'];
const SPACING_KEYS = ['groundSlabBarSpacing', 'secondSlabBarSpacing', 'columnTieSpacing', 'beamStirrupSpacing'];
const ALLOWED_BAR_SIZES_MM = [10, 12, 16];
const MIN_SPACING_M = 0.05;

function validateOverrides(overrides) {
  const given = (key) => overrides[key] !== undefined && overrides[key] !== null && overrides[key] !== '';
  for (const key of BAR_SIZE_KEYS) {
    if (given(key) && !ALLOWED_BAR_SIZES_MM.includes(Number(overrides[key]))) {
      throw new HttpError(400, 'Bar sizes can be 10, 12 or 16mm, the sizes local stores usually carry.');
    }
  }
  for (const key of SPACING_KEYS) {
    if (given(key) && !(Number(overrides[key]) >= MIN_SPACING_M)) {
      throw new HttpError(400, 'Bar and tie spacing must be at least 0.05 m.');
    }
  }
  if (given('footingThickness') && !(Number(overrides.footingThickness) >= 0.1 && Number(overrides.footingThickness) <= 2)) {
    throw new HttpError(400, 'Footing thickness must be between 0.10 m and 2.00 m.');
  }
  if (given('formworkUses') && ![1, 2, 3].includes(Number(overrides.formworkUses))) {
    throw new HttpError(400, 'Formwork uses must be 1, 2 or 3.');
  }
  if (given('scaffoldingUses') && !(Number.isInteger(Number(overrides.scaffoldingUses)) && Number(overrides.scaffoldingUses) >= 1 && Number(overrides.scaffoldingUses) <= 10)) {
    throw new HttpError(400, 'Scaffolding uses must be a whole number from 1 to 10.');
  }
  for (const key of ['footingCount', 'columnBarCount']) {
    if (given(key) && !(Number.isInteger(Number(overrides[key])) && Number(overrides[key]) >= 1)) {
      throw new HttpError(400, 'Footing count and bars per column must be whole numbers of at least 1.');
    }
  }
}

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

/** Every field is null if this project (or the admin, when projectId is null)
 * never saved it. Shows only what is explicitly set, without the global
 * default (see the "Auto" placeholder in DesignParametersCard). */
export async function getDesignOverrides(projectId) {
  return toApiShape(await fetchRow(projectId));
}

/** What the engine should use: project override, then global default, then the
 * formulas.py default. Only for running the engine, not for display. */
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

/** Saves the override set for a project, or the admin's global row when
 * projectId is null. The global row is upserted by hand because MySQL treats
 * every NULL as unique. */
export async function saveDesignOverrides(projectId, overrides) {
  validateOverrides(overrides);
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

/** Drops null fields so the engine only gets real values and falls back to
 * formulas.py defaults for the rest. */
export function toEngineOverrides(apiShapeOverrides) {
  const engineOverrides = {};
  for (const [apiKey] of FIELDS) {
    const value = apiShapeOverrides[apiKey];
    if (value !== null && value !== undefined) engineOverrides[apiKey] = value;
  }
  return engineOverrides;
}

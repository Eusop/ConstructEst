import fs from 'node:fs';
import { query } from '../config/db.js';
import { toPublicProject } from '../utils/serializers.js';
import { HttpError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { runDxfEngine } from '../services/engine.service.js';
import { getEffectiveConstants } from '../services/constants.service.js';
import { getDesignOverrides, getEffectiveDesignOverrides, saveDesignOverrides, toEngineOverrides } from '../services/designOverrides.service.js';
import { logActivity } from '../services/activity.service.js';
import { getStoreOptimization, getBrandCatalog, saveBrandSelection, computeBom } from '../services/optimization.service.js';

function parseBoolean(value) {
  return value === true || value === 'true' || value === '1';
}

async function loadProjectOr404(id) {
  const [project] = await query('SELECT * FROM projects WHERE id = ?', [id]);
  if (!project) throw new HttpError(404, 'Project not found.');
  return project;
}

function assertAccess(project, user) {
  if (project.user_id !== user.id && user.accessRole !== 'admin') {
    throw new HttpError(403, 'You do not have access to this project.');
  }
}

async function loadCurrentEstimation(projectId) {
  const [estimation] = await query(
    'SELECT * FROM estimation_results WHERE project_id = ? AND is_current = 1 ORDER BY computed_at DESC LIMIT 1',
    [projectId],
  );
  if (!estimation) return null;

  // The cheapest catalog price per material gives the Quantity Take-off
  // table an indicative unit/total cost before a store is even chosen —
  // final pricing comes from the store + brand selection made later.
  const lineItems = await query(
    `SELECT eli.material_key AS \`key\`, eli.name, eli.quantity, eli.unit, eli.basis,
            COALESCE((SELECT MIN(base_price) FROM material_brands WHERE material_key = eli.material_key), 0) AS unitCost
     FROM estimation_line_items eli
     WHERE eli.estimation_id = ?`,
    [estimation.id],
  );

  return {
    measurements: {
      totalWallLength: estimation.total_wall_length,
      floorArea: estimation.floor_area,
      roofArea: estimation.roof_area,
      roomsDetected: estimation.rooms_detected,
    },
    estimatedCost: estimation.estimated_cost,
    materials: lineItems.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitCost: Number(item.unitCost),
      totalCost: Math.round(Number(item.quantity) * Number(item.unitCost) * 100) / 100,
    })),
  };
}

export const listProjects = asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  res.json({ projects: rows.map(toPublicProject) });
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await loadProjectOr404(req.params.id);
  assertAccess(project, req.user);
  const estimation = await loadCurrentEstimation(project.id);
  res.json({ project: toPublicProject(project), estimation });
});

export const deleteProject = asyncHandler(async (req, res) => {
  const project = await loadProjectOr404(req.params.id);
  assertAccess(project, req.user);

  await query('DELETE FROM projects WHERE id = ?', [project.id]);
  if (project.dxf_file_path) {
    fs.rm(project.dxf_file_path, { force: true }, () => {});
  }
  res.status(204).end();
});

export const createProject = asyncHandler(async (req, res) => {
  const { projectName, location } = req.body;
  const budgetCeiling = Number(String(req.body.budgetCeiling ?? '').replace(/,/g, ''));
  const storeys = Math.min(Math.max(Number.parseInt(req.body.storeys, 10) || 1, 1), 2);
  const includeRoofing = parseBoolean(req.body.includeRoofing);

  if (!projectName || !location) throw new HttpError(400, 'Project name and location are required.');
  if (!Number.isFinite(budgetCeiling) || budgetCeiling <= 0) throw new HttpError(400, 'Budget ceiling must be greater than 0.');
  if (!req.file) throw new HttpError(400, 'A .dxf floor plan file is required.');

  const insertResult = await query(
    `INSERT INTO projects (user_id, project_name, location, budget_ceiling, storeys, include_roofing, status, dxf_file_path, dxf_original_name)
     VALUES (?, ?, ?, ?, ?, ?, 'parsing', ?, ?)`,
    [req.user.id, projectName, location, budgetCeiling, storeys, includeRoofing ? 1 : 0, req.file.path, req.file.originalname],
  );
  const projectId = insertResult.insertId;

  const constants = await getEffectiveConstants(null);
  const overrides = await getEffectiveDesignOverrides(projectId);

  let engineResult;
  let parseError = null;
  try {
    engineResult = await runDxfEngine({
      dxfPath: req.file.path,
      storeys,
      includeRoofing,
      constants,
      overrides: toEngineOverrides(overrides),
    });
  } catch (err) {
    parseError = err.message || 'DXF parsing failed.';
  }

  if (!engineResult) {
    await query('UPDATE projects SET status = ? WHERE id = ?', ['failed', projectId]);
    const project = await loadProjectOr404(projectId);
    return res.status(201).json({ project: toPublicProject(project), estimation: null, parseError });
  }

  await persistEstimation(projectId, engineResult);
  await query('UPDATE projects SET status = ? WHERE id = ?', ['parsed', projectId]);
  await logActivity(req.user.id, projectId, 'project_created', `Created project "${projectName}" and computed its estimate.`);

  const project = await loadProjectOr404(projectId);
  const estimation = await loadCurrentEstimation(projectId);
  res.status(201).json({ project: toPublicProject(project), estimation, parseError: null });
});

/** Marks any prior estimation as no longer current, then inserts a fresh
 * estimation_results + estimation_line_items run — used by both initial
 * project creation and the Recalculate action (design-overrides / constants
 * changes never overwrite a past run, matching FR-9/FR-17). */
async function persistEstimation(projectId, engineResult) {
  await query('UPDATE estimation_results SET is_current = 0 WHERE project_id = ? AND is_current = 1', [projectId]);

  const estimatedCost = await estimateTotalCost(engineResult.materials);
  const estResult = await query(
    `INSERT INTO estimation_results (project_id, total_wall_length, floor_area, roof_area, rooms_detected, estimated_cost)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      engineResult.measurements.totalWallLength,
      engineResult.measurements.floorArea,
      engineResult.measurements.roofArea,
      engineResult.measurements.roomsDetected,
      estimatedCost,
    ],
  );

  for (const material of engineResult.materials) {
    await query(
      `INSERT INTO estimation_line_items (estimation_id, material_key, name, quantity, unit, basis)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [estResult.insertId, material.key, material.name, material.quantity, material.unit, material.basis],
    );
  }

  return estResult.insertId;
}

export const getProjectDesignOverrides = asyncHandler(async (req, res) => {
  const project = await loadProjectOr404(req.params.id);
  assertAccess(project, req.user);
  const overrides = await getDesignOverrides(project.id);
  res.json({ overrides });
});

export const putProjectDesignOverrides = asyncHandler(async (req, res) => {
  const project = await loadProjectOr404(req.params.id);
  assertAccess(project, req.user);
  const overrides = await saveDesignOverrides(project.id, req.body);
  res.json({ overrides });
});

/** Re-runs the DXF engine against the project's already-uploaded file with
 * its current calibration constants + design overrides — used after the
 * user tweaks either on the Material Estimation page, without re-uploading.
 *
 * Also accepts an optional `includeRoofing` override in the body — lets the
 * user flip Roofing on/off after seeing the parsed take-off (e.g. a real
 * DXF with no ROOF layer at all), rather than that only ever being settable
 * at upload time. When present it's persisted back onto the project so the
 * next recompute, store comparison, and PDF BOM all stay consistent with it. */
export const recomputeEstimation = asyncHandler(async (req, res) => {
  const project = await loadProjectOr404(req.params.id);
  assertAccess(project, req.user);
  if (!project.dxf_file_path) throw new HttpError(400, 'This project has no DXF file to recompute from.');

  const includeRoofing = req.body.includeRoofing === undefined
    ? Boolean(project.include_roofing)
    : parseBoolean(req.body.includeRoofing);

  if (includeRoofing !== Boolean(project.include_roofing)) {
    await query('UPDATE projects SET include_roofing = ? WHERE id = ?', [includeRoofing ? 1 : 0, project.id]);
  }

  const [constants, overrides] = await Promise.all([
    getEffectiveConstants(project.id),
    getEffectiveDesignOverrides(project.id),
  ]);

  let engineResult;
  try {
    engineResult = await runDxfEngine({
      dxfPath: project.dxf_file_path,
      storeys: project.storeys,
      includeRoofing,
      constants,
      overrides: toEngineOverrides(overrides),
    });
  } catch (err) {
    throw new HttpError(422, err.message || 'Recompute failed.');
  }

  await persistEstimation(project.id, engineResult);
  await query('UPDATE projects SET status = ? WHERE id = ?', ['parsed', project.id]);
  await logActivity(req.user.id, project.id, 'estimation_recomputed', `Recomputed estimate for "${project.project_name}".`);

  const updatedProject = await loadProjectOr404(project.id);
  const estimation = await loadCurrentEstimation(project.id);
  res.json({ project: toPublicProject(updatedProject), estimation });
});

/** Rough project-level cost using each material's cheapest brand — the real
 * per-store optimized total comes from GET /api/projects/:id/stores once a
 * store is chosen; this just seeds `estimated_cost` for the dashboard/list. */
async function estimateTotalCost(materials) {
  let total = 0;
  for (const material of materials) {
    const [cheapest] = await query(
      'SELECT MIN(base_price) AS price FROM material_brands WHERE material_key = ?',
      [material.key],
    );
    total += (cheapest?.price ?? 0) * material.quantity;
  }
  return total;
}

export const getProjectStores = asyncHandler(async (req, res) => {
  const project = await loadProjectOr404(req.params.id);
  assertAccess(project, req.user);
  const stores = await getStoreOptimization(project.id);
  res.json({ stores });
});

export const getProjectBrandCatalog = asyncHandler(async (req, res) => {
  const project = await loadProjectOr404(req.params.id);
  assertAccess(project, req.user);
  const storeId = Number(req.query.storeId);
  if (!storeId) throw new HttpError(400, 'storeId query param is required.');
  const catalog = await getBrandCatalog(project.id, storeId);
  res.json({ catalog });
});

export const postBrandSelection = asyncHandler(async (req, res) => {
  const project = await loadProjectOr404(req.params.id);
  assertAccess(project, req.user);
  const { storeId, choices } = req.body;
  if (!storeId || !choices || typeof choices !== 'object') {
    throw new HttpError(400, 'storeId and a choices object are required.');
  }
  const bom = await saveBrandSelection(project.id, storeId, choices);
  await logActivity(req.user.id, project.id, 'brand_selection_saved', `Saved brand selection for "${project.project_name}".`);
  res.json(bom);
});

export const getProjectBom = asyncHandler(async (req, res) => {
  const project = await loadProjectOr404(req.params.id);
  assertAccess(project, req.user);
  const storeId = Number(req.query.storeId ?? project.selected_store_id);
  if (!storeId) throw new HttpError(400, 'No store selected yet — pass storeId or save a brand selection first.');
  const bom = await computeBom(project.id, storeId);
  res.json(bom);
});

export const getProjectConstants = asyncHandler(async (req, res) => {
  const project = await loadProjectOr404(req.params.id);
  assertAccess(project, req.user);
  const constants = await getEffectiveConstants(project.id);
  res.json({ constants });
});

export const putProjectConstants = asyncHandler(async (req, res) => {
  const project = await loadProjectOr404(req.params.id);
  assertAccess(project, req.user);
  const { cementFactor, steelFactor, roofingFactor, wastagePercent } = req.body;

  await query(
    `INSERT INTO estimation_constants (project_id, cement_factor, steel_factor, roofing_factor, wastage_percent)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE cement_factor = VALUES(cement_factor), steel_factor = VALUES(steel_factor),
       roofing_factor = VALUES(roofing_factor), wastage_percent = VALUES(wastage_percent)`,
    [project.id, cementFactor, steelFactor, roofingFactor, wastagePercent],
  );

  const constants = await getEffectiveConstants(project.id);
  res.json({ constants });
});

export const resetProjectConstants = asyncHandler(async (req, res) => {
  const project = await loadProjectOr404(req.params.id);
  assertAccess(project, req.user);
  await query('DELETE FROM estimation_constants WHERE project_id = ?', [project.id]);
  const constants = await getEffectiveConstants(null);
  res.json({ constants });
});

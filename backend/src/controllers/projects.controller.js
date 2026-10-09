import fs from 'node:fs';
import { query } from '../config/db.js';
import { toPublicProject } from '../utils/serializers.js';
import { HttpError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { runDxfEngine } from '../services/engine.service.js';
import { getEffectiveConstants } from '../services/constants.service.js';
import { getDesignOverrides, getEffectiveDesignOverrides, saveDesignOverrides, toEngineOverrides } from '../services/designOverrides.service.js';
import { logActivity } from '../services/activity.service.js';
import { getStoreOptimization, getBrandCatalog, getAllStoreCatalog, saveBrandSelection, computeBom } from '../services/optimization.service.js';

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

  // Uses the cheapest catalog price per material as a rough estimate
  // before a store is picked. Real pricing comes later from brand selection.
  const lineItems = await query(
    `SELECT eli.material_key AS \`key\`, eli.name, eli.quantity, eli.unit, eli.basis, eli.source_breakdown, eli.calc_steps, eli.bar_pieces,
            COALESCE((SELECT MIN(base_price) FROM material_brands WHERE material_key = eli.material_key), 0) AS unitCost
     FROM estimation_line_items eli
     WHERE eli.estimation_id = ?`,
    [estimation.id],
  );

  const measurements = {
    totalWallLength: estimation.total_wall_length,
    floorArea: estimation.floor_area,
    roofArea: estimation.roof_area,
    roomsDetected: estimation.rooms_detected,
    doorArea: estimation.door_area,
    windowArea: estimation.window_area,
    columnCount: estimation.column_count,
    floorPerimeter: estimation.floor_perimeter,
    roofPerimeter: estimation.roof_perimeter,
    roofRidgeLength: estimation.roof_ridge_length,
  };
  // What the engine used for blank Design parameters (migration 041). Null
  // for estimates saved before it; Recalculate fills it in.
  const computed = estimation.computed_defaults;
  measurements.computedDefaults = typeof computed === 'string' ? JSON.parse(computed) : computed ?? null;
  // "By member" breakdown like the engineer's manual sheets (migration 043).
  const members = estimation.member_breakdown;
  const memberBreakdown = typeof members === 'string' ? JSON.parse(members) : members ?? null;
  if (estimation.ground_wall_length !== null) {
    measurements.groundFloor = { wallLength: estimation.ground_wall_length, floorArea: estimation.ground_floor_area };
    measurements.secondFloor = { wallLength: estimation.second_wall_length, floorArea: estimation.second_floor_area };
  }

  return {
    measurements,
    memberBreakdown,
    estimatedCost: estimation.estimated_cost,
    materials: lineItems.map(({ source_breakdown, calc_steps, bar_pieces, ...item }) => ({
      ...item,
      quantity: Number(item.quantity),
      unitCost: Number(item.unitCost),
      totalCost: Math.round(Number(item.quantity) * Number(item.unitCost) * 100) / 100,
      // mysql2 usually parses JSON columns already; the typeof check is a fallback.
      sourceBreakdown: typeof source_breakdown === 'string' ? JSON.parse(source_breakdown) : source_breakdown,
      // Null for estimations saved before migration 023 (recalculate to get them).
      steps: typeof calc_steps === 'string' ? JSON.parse(calc_steps) : calc_steps,
      // 6 m bars per size for rebar, priced per piece (migration 036). Null for other materials.
      barPieces: typeof bar_pieces === 'string' ? JSON.parse(bar_pieces) : bar_pieces ?? null,
    })),
  };
}

export const listProjects = asyncHandler(async (req, res) => {
  // has_brand_selection lets the client mark a project Complete after a reload.
  const rows = await query(
    `SELECT p.*, EXISTS(SELECT 1 FROM project_brand_selections b WHERE b.project_id = p.id) AS has_brand_selection
     FROM projects p WHERE p.user_id = ? ORDER BY p.created_at DESC`,
    [req.user.id],
  );
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
  if (project.second_floor_dxf_path) {
    fs.rm(project.second_floor_dxf_path, { force: true }, () => {});
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
  const primaryFile = req.files?.dxfFile?.[0];
  if (!primaryFile) throw new HttpError(400, 'A .dxf floor plan file is required.');
  // A 2-storey project needs its own second floor DXF, so the engine uses each
  // floor's real geometry (and the roof from the second floor file).
  const secondFloorFile = req.files?.secondFloorDxfFile?.[0] ?? null;
  if (storeys === 2 && !secondFloorFile) {
    // Remove the file multer already saved, since no project will use it.
    fs.rm(primaryFile.path, { force: true }, () => {});
    throw new HttpError(400, 'A second floor .dxf file is required for a 2-storey project.');
  }

  const insertResult = await query(
    `INSERT INTO projects (user_id, project_name, location, budget_ceiling, storeys, include_roofing, status, dxf_file_path, dxf_original_name, second_floor_dxf_path, second_floor_dxf_original_name)
     VALUES (?, ?, ?, ?, ?, ?, 'parsing', ?, ?, ?, ?)`,
    [
      req.user.id, projectName, location, budgetCeiling, storeys, includeRoofing ? 1 : 0,
      primaryFile.path, primaryFile.originalname,
      secondFloorFile?.path ?? null, secondFloorFile?.originalname ?? null,
    ],
  );
  const projectId = insertResult.insertId;

  const constants = await getEffectiveConstants(null);
  const overrides = await getEffectiveDesignOverrides(projectId);

  let engineResult;
  let parseError = null;
  try {
    engineResult = await runDxfEngine({
      dxfPath: primaryFile.path,
      secondFloorDxfPath: secondFloorFile?.path,
      storeys,
      includeRoofing,
      constants,
      overrides: toEngineOverrides(overrides),
    });
  } catch (err) {
    // Only pass through messages we wrote. A 4xx from the engine is a useful
    // user message, but a 5xx carries raw Python stderr (traceback and server
    // paths). This response skips errorHandler, which cleans 500s elsewhere.
    const isUserFacing = err instanceof HttpError && err.status >= 400 && err.status < 500;
    if (!isUserFacing) console.error('DXF parsing failed:', err);
    parseError = isUserFacing ? err.message : 'DXF parsing failed. Check that the file is a valid DXF and try again.';
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

/** Marks the old estimation as not current and saves a new one. Used by
 * project creation and Recalculate; past runs are never overwritten. */
async function persistEstimation(projectId, engineResult) {
  await query('UPDATE estimation_results SET is_current = 0 WHERE project_id = ? AND is_current = 1', [projectId]);

  const estimatedCost = await estimateTotalCost(engineResult.materials);
  const { groundFloor, secondFloor } = engineResult.measurements;
  const estResult = await query(
    `INSERT INTO estimation_results
       (project_id, total_wall_length, floor_area, roof_area, rooms_detected,
        door_area, window_area, column_count, floor_perimeter, roof_perimeter, roof_ridge_length,
        ground_wall_length, ground_floor_area, second_wall_length, second_floor_area, estimated_cost, computed_defaults, member_breakdown)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      engineResult.measurements.totalWallLength,
      engineResult.measurements.floorArea,
      engineResult.measurements.roofArea,
      engineResult.measurements.roomsDetected,
      engineResult.measurements.doorArea,
      engineResult.measurements.windowArea,
      engineResult.measurements.columnCount,
      engineResult.measurements.floorPerimeter,
      engineResult.measurements.roofPerimeter,
      engineResult.measurements.roofRidgeLength,
      groundFloor?.wallLength ?? null,
      groundFloor?.floorArea ?? null,
      secondFloor?.wallLength ?? null,
      secondFloor?.floorArea ?? null,
      estimatedCost,
      engineResult.measurements.computedDefaults ? JSON.stringify(engineResult.measurements.computedDefaults) : null,
      engineResult.memberBreakdown ? JSON.stringify(engineResult.memberBreakdown) : null,
    ],
  );

  for (const material of engineResult.materials) {
    await query(
      `INSERT INTO estimation_line_items (estimation_id, material_key, name, quantity, unit, basis, source_breakdown, calc_steps, bar_pieces)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        estResult.insertId, material.key, material.name, material.quantity, material.unit, material.basis,
        material.sourceBreakdown ? JSON.stringify(material.sourceBreakdown) : null,
        material.steps ? JSON.stringify(material.steps) : null,
        material.barPieces ? JSON.stringify(material.barPieces) : null,
      ],
    );
  }

  return estResult.insertId;
}

export const getProjectDesignOverrides = asyncHandler(async (req, res) => {
  const project = await loadProjectOr404(req.params.id);
  assertAccess(project, req.user);
  // `overrides` is this project's own saved values (null where unset).
  // `effectiveDefaults` is what the engine will use for blank fields (project
  // override, then the admin's global default, then the formulas.py default).
  // Regular users can't call the admin endpoint, so this gives the Design
  // Parameters placeholders the real global default.
  const [overrides, effectiveDefaults] = await Promise.all([
    getDesignOverrides(project.id),
    getEffectiveDesignOverrides(project.id),
  ]);
  res.json({ overrides, effectiveDefaults });
});

export const putProjectDesignOverrides = asyncHandler(async (req, res) => {
  const project = await loadProjectOr404(req.params.id);
  assertAccess(project, req.user);
  const overrides = await saveDesignOverrides(project.id, req.body);
  res.json({ overrides });
});

/** Re-runs the engine on the uploaded file with the current constants and
 * overrides. Also takes an optional `includeRoofing`, which is saved on the
 * project so later recomputes stay consistent. */
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
      secondFloorDxfPath: project.second_floor_dxf_path ?? undefined,
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

/** Rough total using each material's cheapest brand, just for the
 * dashboard/list. Real optimized pricing comes from the stores endpoint. */
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

// Every store's options, for the per-material supplier dropdown (migration 038).
export const getProjectAllStoreCatalog = asyncHandler(async (req, res) => {
  const project = await loadProjectOr404(req.params.id);
  assertAccess(project, req.user);
  res.json(await getAllStoreCatalog(project.id));
});

export const postBrandSelection = asyncHandler(async (req, res) => {
  const project = await loadProjectOr404(req.params.id);
  assertAccess(project, req.user);
  const { storeId, choices, suppliers } = req.body;
  if (!storeId || !choices || typeof choices !== 'object') {
    throw new HttpError(400, 'storeId and a choices object are required.');
  }
  if (suppliers !== undefined) {
    if (suppliers === null || typeof suppliers !== 'object') throw new HttpError(400, 'suppliers must be an object.');
    const storeIds = [...new Set(Object.values(suppliers).filter((v) => v !== 'none' && v != null).map(Number))];
    if (storeIds.some((id) => !Number.isInteger(id))) throw new HttpError(400, "Each supplier must be a store id or 'none'.");
    if (storeIds.length > 0) {
      const found = await query('SELECT id FROM stores WHERE is_active = 1 AND id IN (?)', [storeIds]);
      if (found.length !== storeIds.length) throw new HttpError(400, 'One of the suppliers is not an active store.');
    }
  }
  const bom = await saveBrandSelection(project.id, storeId, choices, suppliers);
  await logActivity(req.user.id, project.id, 'brand_selection_saved', `Saved brand selection for "${project.project_name}".`);
  res.json(bom);
});

export const getProjectBom = asyncHandler(async (req, res) => {
  const project = await loadProjectOr404(req.params.id);
  assertAccess(project, req.user);
  const storeId = Number(req.query.storeId ?? project.selected_store_id);
  if (!storeId) throw new HttpError(400, 'No store selected yet, pass storeId or save a brand selection first.');
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

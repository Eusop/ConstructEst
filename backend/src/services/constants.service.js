import { query } from '../config/db.js';

/** Project-level override if one exists, otherwise the global default row. */
export async function getEffectiveConstants(projectId) {
  if (projectId) {
    const [override] = await query('SELECT * FROM estimation_constants WHERE project_id = ?', [projectId]);
    if (override) return toApiShape(override);
  }

  const [global] = await query('SELECT * FROM estimation_constants WHERE project_id IS NULL');
  return toApiShape(global) ?? { cementFactor: 1.08, steelFactor: 1.05, roofingFactor: 1.07, wastagePercent: 5 };
}

function toApiShape(row) {
  if (!row) return null;
  return {
    cementFactor: Number(row.cement_factor),
    steelFactor: Number(row.steel_factor),
    roofingFactor: Number(row.roofing_factor),
    wastagePercent: Number(row.wastage_percent),
  };
}

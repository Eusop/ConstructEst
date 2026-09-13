/** DB user row -> the shape returned to the frontend (never includes password_hash). */
export function toPublicUser(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    userName: `${row.first_name} ${row.last_name}`.trim(),
    employeeId: row.employee_id,
    email: row.email,
    avatarUrl: row.avatar_url,
    accessRole: row.access_role,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  };
}

export function toPublicProject(row) {
  return {
    id: row.id,
    projectName: row.project_name,
    location: row.location,
    budgetCeiling: Number(row.budget_ceiling),
    storeys: row.storeys,
    includeRoofing: Boolean(row.include_roofing),
    hasSecondFloorFile: Boolean(row.second_floor_dxf_path),
    status: row.status,
    selectedStoreId: row.selected_store_id,
    createdAt: row.created_at,
  };
}

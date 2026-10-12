/**
 * The fixed fallback calibration factors (same as the backend's
 * estimation_constants defaults). Used by Material Estimation's "Reset to admin
 * defaults" and AdminSettingsPage's reset, kept separate so a reset doesn't
 * depend on whatever was last loaded.
 */
// Wastage is the general allowance; the other three are optional extras per
// material, off by default so nothing gets two waste allowances.
export const SYSTEM_DEFAULT_FACTORS = { cement: 1.0, steel: 1.0, roofing: 1.0, wastage: 5 };

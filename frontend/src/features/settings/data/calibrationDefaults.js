/**
 * The fixed fallback calibration factors (same as the backend's
 * estimation_constants defaults). Used by Material Estimation's "Reset to admin
 * defaults" and AdminSettingsPage's reset, kept separate so a reset doesn't
 * depend on whatever was last loaded.
 */
export const SYSTEM_DEFAULT_FACTORS = { cement: 1.08, steel: 1.05, roofing: 1.07, wastage: 5 };

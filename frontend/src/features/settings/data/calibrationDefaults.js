/**
 * The true, unchanging fallback calibration factors (matches the backend's
 * estimation_constants table defaults) — used by Material Estimation's
 * "Reset to admin defaults" action and AdminSettingsPage's own reset,
 * kept separate so resetting never depends on whatever was last loaded.
 */
export const SYSTEM_DEFAULT_FACTORS = { cement: 1.08, steel: 1.05, roofing: 1.07, wastage: 5 };

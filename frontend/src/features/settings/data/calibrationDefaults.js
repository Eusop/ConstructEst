/**
 * `CALIBRATION_DEFAULTS` is a live cache of the *currently applied*
 * calibration factors for the active project — populated by
 * `loadCalibrationFactors()` (see MaterialEstimationPage/SettingsPage)
 * from GET /api/projects/:id/constants (or the global default, if the
 * project has no override). FactorsAppliedBanner reads it directly, so
 * populating it here is all that's needed for the banner to show the real
 * applied factors without changing the banner itself.
 *
 * `SYSTEM_DEFAULT_FACTORS` is the true, unchanging fallback (matches the
 * backend's estimation_constants table defaults) — used by Settings'
 * "Reset to admin defaults" action, kept separate so resetting doesn't
 * depend on whatever happened to be loaded most recently.
 */
export const SYSTEM_DEFAULT_FACTORS = { cement: 1.08, steel: 1.05, roofing: 1.07, wastage: 5 };

export const CALIBRATION_DEFAULTS = { ...SYSTEM_DEFAULT_FACTORS };

/** @param {{cementFactor:number, steelFactor:number, roofingFactor:number, wastagePercent:number}} constants */
export function loadCalibrationFactors(constants) {
  CALIBRATION_DEFAULTS.cement = constants.cementFactor;
  CALIBRATION_DEFAULTS.steel = constants.steelFactor;
  CALIBRATION_DEFAULTS.roofing = constants.roofingFactor;
  CALIBRATION_DEFAULTS.wastage = constants.wastagePercent;
}

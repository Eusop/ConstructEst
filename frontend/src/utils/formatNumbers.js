/**
 * One place for how numbers are shown on the estimation and BOM screens.
 *
 * - Measurements (m, m²): 2 decimals (the backend rounds to 2).
 * - Quantities: sand, gravel, rebar and tie wire (ordered by volume or weight)
 *   get 4 decimals. Everything else is a count the engine already rounded up,
 *   so it is shown whole.
 * - Money: 2 decimals, so centavos are kept.
 */

// Mirrors WHOLE_UNITS / FRACTIONAL_UNITS in backend/engine/formulas.py. Only
// the fractional ones can have a meaningful decimal part.
const FRACTIONAL_UNITS = new Set(['m3', 'tons', 'kg']);

const MEASUREMENT_DECIMALS = 2;
const QUANTITY_DECIMALS = 4;

/** Number of decimals a given material unit should be displayed with. */
export function decimalsForUnit(unit) {
  return FRACTIONAL_UNITS.has(unit) ? QUANTITY_DECIMALS : 0;
}

/**
 * A material quantity. The unit decides whether decimals apply; without a
 * unit it is treated as a count and shown whole.
 */
export function formatQuantity(quantity, unit) {
  const decimals = decimalsForUnit(unit);
  return Number(quantity).toLocaleString('en-PH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * A measurement read off the DXF (length, area, perimeter). Returns a
 * placeholder for null/undefined (older estimations without these fields).
 */
export function formatMeasurement(value, suffix = '') {
  if (value == null) return '—';
  const text = Number(value).toLocaleString('en-PH', {
    minimumFractionDigits: MEASUREMENT_DECIMALS,
    maximumFractionDigits: MEASUREMENT_DECIMALS,
  });
  return `${text}${suffix}`;
}

/** A whole-number count (e.g. columns). Never gets decimals. */
export function formatCount(value, suffix = '') {
  if (value == null) return '—';
  return `${Number(value).toLocaleString('en-PH')}${suffix}`;
}

/** Peso amount, always two decimals. */
export function formatPeso(value) {
  return `₱${Number(value ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Same as formatPeso but without the sign, for tables that show the unit separately. */
export function formatAmount(value) {
  return Number(value ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

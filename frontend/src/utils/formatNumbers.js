/**
 * One place for every number the estimation/BOM screens display, because the
 * same formatter logic used to be copy-pasted in three files and drift between
 * them was inevitable.
 *
 * How many decimals each kind of number gets, and why:
 *
 * - Measurements (m, m²) -> 4. The backend rounds to 2 and stores DECIMAL(10,2),
 *   so the last two digits are always zeros. That is deliberate: it keeps the
 *   column visually aligned and makes it obvious the value is a measurement
 *   rather than a count. It also fixes a real bug - these used to be dropped
 *   straight into a template string, so a stored 120.00 arrived from JSON as
 *   the number 120 and rendered as "120 m", losing the decimals entirely.
 * - Quantities -> depends on the unit. Sand/gravel/rebar/tie wire are ordered
 *   by volume or weight and get 4; everything else is a count of physical
 *   items (bags, sheets, pieces) that the engine already rounded up with
 *   ceil(), so showing "962.0000 pcs" of hollow blocks would just look broken.
 * - Money -> 2, the way currency is always written. Everything used to
 *   Math.round() to whole pesos, throwing away the centavos the database
 *   actually stores.
 */

// Mirrors WHOLE_UNITS / FRACTIONAL_UNITS in backend/engine/formulas.py. Only
// the fractional ones can have a meaningful decimal part.
const FRACTIONAL_UNITS = new Set(['m3', 'tons', 'kg']);

const MEASUREMENT_DECIMALS = 4;
const QUANTITY_DECIMALS = 4;

/** Number of decimals a given material unit should be displayed with. */
export function decimalsForUnit(unit) {
  return FRACTIONAL_UNITS.has(unit) ? QUANTITY_DECIMALS : 0;
}

/**
 * A material quantity, with the unit deciding whether decimals apply.
 * Pass the unit whenever you have it; without it the value is treated as a
 * count and shown whole.
 */
export function formatQuantity(quantity, unit) {
  const decimals = decimalsForUnit(unit);
  return Number(quantity).toLocaleString('en-PH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * A measurement read off the DXF (lengths, areas, perimeters). Returns the
 * placeholder for null/undefined, which is what an older estimation row that
 * predates the detailed-extraction migration will have.
 */
export function formatMeasurement(value, suffix = '') {
  if (value == null) return '—';
  const text = Number(value).toLocaleString('en-PH', {
    minimumFractionDigits: MEASUREMENT_DECIMALS,
    maximumFractionDigits: MEASUREMENT_DECIMALS,
  });
  return `${text}${suffix}`;
}

/** A whole-number count (rooms detected, columns). Never gets decimals. */
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

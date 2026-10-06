// Stock count for display, e.g. 120 -> "120", 2.5 -> "2.5". Null if unknown.
export function formatStock(value) {
  if (value == null) return null;
  return Number(value).toLocaleString('en-PH', { maximumFractionDigits: 2 });
}

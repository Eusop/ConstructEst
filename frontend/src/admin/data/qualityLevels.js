// Brand quality, 1 to 5 (material_brands.quality). Brand Selection's Premium
// tier picks the highest one, so the number stays; the admin sees the words.
export const QUALITY_LEVELS = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Fair' },
  { value: 3, label: 'Good' },
  { value: 4, label: 'Very good' },
  { value: 5, label: 'Excellent' },
];

// e.g. 3 -> "Good (3)"
export function qualityLabel(value) {
  const level = QUALITY_LEVELS.find((q) => q.value === Number(value));
  return level ? `${level.label} (${level.value})` : 'Not rated';
}

// Stock count for display, e.g. 120 -> "120", 2.5 -> "2.5". Null if unknown.
export function formatStock(value) {
  if (value == null) return null;
  return Number(value).toLocaleString('en-PH', { maximumFractionDigits: 2 });
}

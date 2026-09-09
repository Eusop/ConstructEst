import { colors } from '../../../theme/palette';
import { formatPeso } from '../../../utils/formatNumbers';

// This popup is built as a raw HTML string (see buildStoreInfoWindowContent's
// own comment below for why), so anything that came from the database -
// store name, address, etc, set through the admin panel - has to be escaped
// before it goes in. Otherwise a store name like <img src=x onerror=...>
// would actually execute in every user's browser who opens that popup, not
// just render as text.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds the HTML string shown inside a store marker's map popup (Leaflet,
 * via MapView). Popup content has to be plain HTML (it's rendered outside
 * React's tree), so this stays a small template-string builder rather than
 * a component — kept in Store Locator's own utils since the generic
 * MapView component has no knowledge of what a "store" is.
 *
 * @param {object} store One entry from features/storeLocator/data/storesMock.
 */
export function buildStoreInfoWindowContent(store) {
  const stockLine = store.inStock
    ? `<div style="color:${colors.iconGreenFg};font-weight:600;font-size:12px;margin-top:6px;">✓ ${escapeHtml(store.stockLabel)}</div>`
    : `<div style="color:${colors.orange};font-weight:600;font-size:12px;margin-top:6px;">⚠ No ${escapeHtml(store.outOfStockMaterial)} in stock. Try ${escapeHtml(store.suggestedStoreName)} for this item.</div>`;

  // No per-material price breakdown at this level — GET /projects/:id/stores
  // only returns each store's aggregate optimized total (Table 20); the
  // itemized per-material prices used to be assumed here from an older mock
  // shape that never matched what the real endpoint returns, so this popup
  // just shows the total instead of a (never-actually-populated) price table.
  const totalLine = store.totalCost
    ? `<div style="font-weight:700;font-size:14px;color:${colors.textPrimary};margin-top:8px;">${formatPeso(store.totalCost)}</div>`
    : '';

  return `
    <div style="font-family:Roboto,Helvetica,Arial,sans-serif;min-width:220px;max-width:260px;padding:2px;">
      <div style="font-weight:700;font-size:14px;color:${colors.textPrimary};">${escapeHtml(store.name)}</div>
      <div style="color:${colors.textSecondary};font-size:12px;margin-top:2px;">${escapeHtml(store.address)}</div>
      <div style="display:flex;gap:12px;font-size:12px;color:${colors.textPrimary};margin-top:6px;">
        <span>📍 ${escapeHtml(store.distanceLabel)}</span>
        <span>⏱ ${escapeHtml(store.travelTimeLabel)}</span>
      </div>
      ${totalLine}
      ${stockLine}
    </div>
  `;
}

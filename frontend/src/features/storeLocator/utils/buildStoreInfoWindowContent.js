import { colors } from '../../../theme/palette';
import { formatPeso } from '../../../utils/formatNumbers';

// The popup is a raw HTML string (see below), so database values (store name,
// address, set in the admin panel) must be escaped. Otherwise a name like
// <img src=x onerror=...> would run in every user's browser that opens the popup.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds the HTML string shown in a store marker's map popup (Leaflet, via
 * MapView). Popup content must be plain HTML (rendered outside React), so this is
 * a small template builder, kept here because MapView knows nothing about stores.
 *
 * @param {object} store One entry from features/storeLocator/data/storesCache.
 */
export function buildStoreInfoWindowContent(store) {
  const stockLine = store.inStock
    ? `<div style="color:${colors.iconGreenFg};font-weight:600;font-size:12px;margin-top:6px;">✓ ${escapeHtml(store.stockLabel)}</div>`
    : `<div style="color:${colors.orange};font-weight:600;font-size:12px;margin-top:6px;">⚠ ${escapeHtml(store.stockLabel)}</div>`;

  // No per-material price breakdown: GET /projects/:id/stores only returns each
  // store's total (Table 20), so the popup shows just the total.
  const totalLine = store.totalCost
    ? `<div style="font-weight:700;font-size:14px;color:${colors.textPrimary};margin-top:8px;">${formatPeso(store.totalCost)}</div>`
    : '';

  return `
    <div style="font-family:Sora,Helvetica,Arial,sans-serif;min-width:220px;max-width:260px;padding:2px;">
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

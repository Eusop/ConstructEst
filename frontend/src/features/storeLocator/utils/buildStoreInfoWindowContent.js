import { colors } from '../../../theme/palette';

function formatPeso(value) {
  return `₱${Math.round(value).toLocaleString('en-PH')}`;
}

/**
 * Builds the HTML string shown inside a store marker's Google Maps
 * InfoWindow. InfoWindow content has to be plain HTML (it's rendered
 * outside React's tree), so this stays a small template-string builder
 * rather than a component — kept in Store Locator's own utils since the
 * generic GoogleMapView component has no knowledge of what a "store" is.
 *
 * @param {object} store One entry from features/storeLocator/data/storesMock.
 */
export function buildStoreInfoWindowContent(store) {
  const stockLine = store.inStock
    ? `<div style="color:${colors.iconGreenFg};font-weight:600;font-size:12px;margin-top:6px;">✓ ${store.stockLabel}</div>`
    : `<div style="color:${colors.orange};font-weight:600;font-size:12px;margin-top:6px;">⚠ No ${store.outOfStockMaterial} in stock. Try ${store.suggestedStoreName} for this item.</div>`;

  const priceRows = store.materialPrices
    .map(
      (item) => `
        <tr>
          <td style="padding:2px 10px 2px 0;color:${colors.textSecondary};">${item.material}</td>
          <td style="padding:2px 0;text-align:right;font-weight:600;color:${colors.textPrimary};white-space:nowrap;">${formatPeso(item.price)}</td>
        </tr>`,
    )
    .join('');

  const priceTable = store.materialPrices.length
    ? `<table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;">${priceRows}</table>`
    : '';

  const totalLine = store.totalCost
    ? `<div style="font-weight:700;font-size:14px;color:${colors.textPrimary};margin-top:8px;">${formatPeso(store.totalCost)}</div>`
    : '';

  return `
    <div style="font-family:Roboto,Helvetica,Arial,sans-serif;min-width:220px;max-width:260px;padding:2px;">
      <div style="font-weight:700;font-size:14px;color:${colors.textPrimary};">${store.name}</div>
      <div style="color:${colors.textSecondary};font-size:12px;margin-top:2px;">${store.address}</div>
      <div style="display:flex;gap:12px;font-size:12px;color:${colors.textPrimary};margin-top:6px;">
        <span>📍 ${store.distanceLabel}</span>
        <span>⏱ ${store.travelTimeLabel}</span>
      </div>
      ${totalLine}
      ${stockLine}
      ${priceTable}
    </div>
  `;
}

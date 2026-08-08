/**
 * Per-store price multiplier applied to the shared baseline take-off — the
 * one thing both the Store Locator's cost comparison and Brand Selection's
 * store-scoped brand catalog scale by, kept in one place so the two
 * features can't drift out of sync. A real backend would return each
 * store's actual prices directly instead of a multiplier.
 */
export const STORE_PRICE_MULTIPLIERS = {
  'tarlac-builders-depot': 1,
  'jrs-hardware-supply': 1.015,
  'northgate-home-center': 1.024,
  'villaflor-hardware': 1,
};

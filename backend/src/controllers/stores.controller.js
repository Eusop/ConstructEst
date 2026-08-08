import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listStores = asyncHandler(async (req, res) => {
  const stores = await query('SELECT id, name, address, lat, lng FROM stores ORDER BY name');
  res.json({ stores: stores.map((s) => ({ ...s, lat: Number(s.lat), lng: Number(s.lng) })) });
});

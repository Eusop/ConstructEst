import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listStores = asyncHandler(async (req, res) => {
  const stores = await query(
    `SELECT s.id, s.name, s.address, s.lat, s.lng, s.is_active,
            (SELECT COUNT(*) FROM store_material_prices smp WHERE smp.store_id = s.id) AS stocked_brand_count,
            (SELECT COUNT(DISTINCT mb.material_key) FROM store_material_prices smp
               JOIN material_brands mb ON mb.id = smp.material_brand_id WHERE smp.store_id = s.id) AS stocked_material_key_count
     FROM stores s ORDER BY s.name`,
  );
  res.json({
    stores: stores.map(({ stocked_brand_count, stocked_material_key_count, is_active, ...s }) => ({
      ...s,
      lat: Number(s.lat),
      lng: Number(s.lng),
      isActive: Boolean(is_active),
      stockedBrandCount: Number(stocked_brand_count),
      stockedMaterialKeyCount: Number(stocked_material_key_count),
    })),
  });
});

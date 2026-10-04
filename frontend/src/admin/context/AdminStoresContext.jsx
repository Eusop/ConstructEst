import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMaterialDefinition } from '../data/materialCatalog';
import {
  listAdminStores, createAdminStore, updateAdminStore, setAdminStoreActive, deleteAdminStore, getStoreCatalog,
  createAdminMaterial, updateAdminMaterial, setStoreMaterialPrice, removeStoreMaterialPrice,
} from '../services/adminService';
import { useAdminToast } from './AdminToastContext';

const AdminStoresContext = createContext(null);

// Reshapes the backend's `getStoreCatalog` response (every global brand,
// left-joined with this store's price/availability, see getStoreCatalog in
// admin.controller.js) into the `materialKeys`/`materialData` shape the admin
// pages read. Only brands this store has priced (`storePrice` != null) show up.
function projectCatalog(catalogGroups) {
  const materialKeys = [];
  const materialData = {};
  let stockedCount = 0;

  for (const group of catalogGroups) {
    const stockedBrands = group.brands.filter((brand) => brand.storePrice != null);
    if (stockedBrands.length === 0) continue;

    materialKeys.push(group.materialKey);
    if (group.isCommodity) {
      const [brand] = stockedBrands;
      materialData[group.materialKey] = { price: brand.storePrice, available: brand.inStock, stockQty: brand.stockQty, materialBrandId: brand.materialBrandId };
      stockedCount += 1;
    } else {
      materialData[group.materialKey] = {
        brands: stockedBrands.map((brand) => ({
          id: brand.materialBrandId,
          name: brand.brand,
          unit: group.unit,
          price: brand.storePrice,
          available: brand.inStock,
          quality: brand.quality,
          stockQty: brand.stockQty,
        })),
      };
      stockedCount += stockedBrands.length;
    }
  }

  return { materialKeys, materialData, stockedCount };
}

/**
 * Admin-managed hardware stores and their material/brand catalog: Store ->
 * Material -> Brand -> Price -> Availability (see AdminStoresPage and
 * AdminMaterialsPage). Backed by the real `stores`, `material_brands` and
 * `store_material_prices` tables, the same catalog Store Locator and Brand
 * Selection read, so a change here shows up there. A brand's identity (name,
 * unit, quality) lives in the global `material_brands` row; its price and stock
 * at a store live in `store_material_prices`. "Add Brand" creates both, and
 * "Remove" only deletes the store's price row (the brand stays, in case another
 * store prices it). A store's catalog is fetched lazily when it becomes active:
 * `materialKeys: null` means "not fetched yet", `[]` means "fetched, nothing stocked".
 */
export function AdminStoresProvider({ children }) {
  const [stores, setStores] = useState([]);
  const [activeStoreId, setActiveStoreIdState] = useState(null);
  const { showToast } = useAdminToast();

  useEffect(() => {
    listAdminStores()
      .then(({ stores: rows }) => setStores(rows.map((row) => ({ ...row, materialKeys: null, materialData: {} }))))
      .catch(() => showToast('Could not load hardware stores. Try refreshing the page.', 'warning'));
  }, [showToast]);

  const patchStore = useCallback((storeId, patch) => {
    setStores((prev) => prev.map((store) => (store.id === storeId ? { ...store, ...patch } : store)));
  }, []);

  const loadStoreCatalog = useCallback(async (storeId) => {
    const { catalog } = await getStoreCatalog(storeId);
    const { materialKeys, materialData, stockedCount } = projectCatalog(catalog);
    patchStore(storeId, {
      materialKeys,
      materialData,
      stockedBrandCount: stockedCount,
      stockedMaterialKeyCount: materialKeys.length,
      _catalog: catalog,
    });
  }, [patchStore]);

  const setActiveStoreId = useCallback((storeId) => {
    setActiveStoreIdState(storeId);
    if (storeId != null) {
      loadStoreCatalog(storeId).catch(() => showToast('Could not load this store’s materials. Try again.', 'warning'));
    }
  }, [loadStoreCatalog, showToast]);

  // For UI that reads a store's materialKeys/materialData without making it
  // active (e.g. StoreDetailsDialog). A no-op if already loaded, so it is safe
  // to call on every render.
  const ensureStoreCatalogLoaded = useCallback((storeId) => {
    const store = stores.find((s) => s.id === storeId);
    if (store && store.materialKeys === null) {
      loadStoreCatalog(storeId).catch(() => showToast('Could not load this store’s materials. Try again.', 'warning'));
    }
  }, [stores, loadStoreCatalog, showToast]);

  const addStore = useCallback(async ({ name, address, lat, lng }) => {
    const { store } = await createAdminStore({ name, address, lat, lng });
    const newStore = { ...store, materialKeys: [], materialData: {}, stockedBrandCount: 0, stockedMaterialKeyCount: 0 };
    setStores((prev) => [...prev, newStore]);
    setActiveStoreIdState(store.id);
    return newStore;
  }, []);

  const updateStore = useCallback(async (storeId, { name, address, lat, lng }) => {
    await updateAdminStore(storeId, { name, address, lat, lng });
    patchStore(storeId, { name, address, lat, lng });
  }, [patchStore]);

  // Reversible alternative to removeStore below (typed DEACTIVATE/REACTIVATE
  // confirmation in AdminStoresPage).
  const setStoreActive = useCallback(async (storeId, isActive) => {
    await setAdminStoreActive(storeId, isActive);
    patchStore(storeId, { isActive });
  }, [patchStore]);

  // Waits for the real DELETE before changing local state (see deleteProject in
  // ProjectsContext.jsx): a failed delete must leave the store in place and tell
  // the admin, not make it vanish while it is still in the database.
  const removeStore = useCallback(async (storeId) => {
    await deleteAdminStore(storeId);
    setStores((prev) => prev.filter((store) => store.id !== storeId));
    setActiveStoreIdState((prev) => (prev === storeId ? null : prev));
  }, []);

  const findCatalogGroup = useCallback(
    (storeId, materialKey) => stores.find((s) => s.id === storeId)?._catalog?.find((g) => g.materialKey === materialKey),
    [stores],
  );

  const addMaterialsToStore = useCallback(async (storeId, materialKeys) => {
    for (const key of materialKeys) {
      const group = findCatalogGroup(storeId, key);
      if (!group) continue;
      const unstocked = group.brands.filter((brand) => brand.storePrice == null);
      // usesCatalogPrice: true. Carrying a brand's existing catalog price into its
      // first stocking here isn't a price decision, so it skips the quotation file
      // requirement (see upsertStoreMaterialPrice in admin.controller.js).
      await Promise.all(
        unstocked.map((brand) => setStoreMaterialPrice(storeId, brand.materialBrandId, { price: brand.basePrice, inStock: true, usesCatalogPrice: true })),
      );
    }
    await loadStoreCatalog(storeId);
  }, [findCatalogGroup, loadStoreCatalog]);

  const removeMaterialFromStore = useCallback(async (storeId, materialKey) => {
    const group = findCatalogGroup(storeId, materialKey);
    const stocked = group?.brands.filter((brand) => brand.storePrice != null) ?? [];
    await Promise.all(stocked.map((brand) => removeStoreMaterialPrice(storeId, brand.materialBrandId)));
    await loadStoreCatalog(storeId);
  }, [findCatalogGroup, loadStoreCatalog]);

  const updateBulkMaterial = useCallback(async (storeId, materialKey, updates, quotationFile) => {
    const store = stores.find((s) => s.id === storeId);
    const materialBrandId = store?.materialData[materialKey]?.materialBrandId;
    if (!materialBrandId) return;
    await setStoreMaterialPrice(storeId, materialBrandId, { price: updates.price, inStock: updates.available, stockQty: updates.stockQty }, quotationFile);
    await loadStoreCatalog(storeId);
  }, [stores, loadStoreCatalog]);

  const addBrand = useCallback(async (storeId, materialKey, brand, quotationFile) => {
    const definition = getMaterialDefinition(materialKey);
    const { material } = await createAdminMaterial({
      materialKey,
      materialName: definition?.name ?? materialKey,
      unit: brand.unit ?? definition?.unit ?? '',
      brand: brand.name,
      basePrice: brand.price,
      quality: brand.quality,
      isCommodity: false,
    });
    await setStoreMaterialPrice(storeId, material.id, { price: brand.price, inStock: brand.available, stockQty: brand.stockQty }, quotationFile);
    await loadStoreCatalog(storeId);
    return { id: material.id, ...brand };
  }, [loadStoreCatalog]);

  const updateBrand = useCallback(async (storeId, materialKey, brandId, updates, quotationFile) => {
    await updateAdminMaterial(brandId, { brand: updates.name, unit: updates.unit, quality: updates.quality });
    await setStoreMaterialPrice(storeId, brandId, { price: updates.price, inStock: updates.available, stockQty: updates.stockQty }, quotationFile);
    await loadStoreCatalog(storeId);
  }, [loadStoreCatalog]);

  const removeBrand = useCallback(async (storeId, materialKey, brandId) => {
    await removeStoreMaterialPrice(storeId, brandId);
    await loadStoreCatalog(storeId);
  }, [loadStoreCatalog]);

  const activeStore = useMemo(() => stores.find((store) => store.id === activeStoreId) ?? null, [stores, activeStoreId]);

  const value = useMemo(
    () => ({
      stores,
      activeStoreId,
      activeStore,
      setActiveStoreId,
      ensureStoreCatalogLoaded,
      addStore,
      updateStore,
      setStoreActive,
      removeStore,
      addMaterialsToStore,
      removeMaterialFromStore,
      updateBulkMaterial,
      addBrand,
      updateBrand,
      removeBrand,
    }),
    [
      stores,
      activeStoreId,
      activeStore,
      setActiveStoreId,
      ensureStoreCatalogLoaded,
      addStore,
      updateStore,
      setStoreActive,
      removeStore,
      addMaterialsToStore,
      removeMaterialFromStore,
      updateBulkMaterial,
      addBrand,
      updateBrand,
      removeBrand,
    ],
  );

  return <AdminStoresContext.Provider value={value}>{children}</AdminStoresContext.Provider>;
}

export function useAdminStores() {
  const context = useContext(AdminStoresContext);
  if (!context) {
    throw new Error('useAdminStores must be used within an AdminStoresProvider');
  }
  return context;
}

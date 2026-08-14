import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { getMaterialDefinition } from '../data/materialCatalog';

const AdminStoresContext = createContext(null);

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Admin-managed hardware stores and their store-specific material/brand
 * catalog: Store -> Material -> Brand -> Price -> Availability (see
 * AdminStoresPage / AdminMaterialsPage). Starts empty — no seeded stores —
 * and lives only in this session's memory rather than the backend's real
 * `stores`/`material_brands` tables, which the existing User Module's Store
 * Locator and Brand Selection pages already read from and must keep
 * working unchanged. Same frontend-only-for-now pattern already used by
 * ProjectsContext/NotificationsContext on the User side.
 */
export function AdminStoresProvider({ children }) {
  const [stores, setStores] = useState([]);
  const [activeStoreId, setActiveStoreId] = useState(null);

  const addStore = useCallback(({ name, address, lat, lng }) => {
    const store = { id: makeId(), name, address, lat, lng, materialKeys: [], materialData: {} };
    setStores((prev) => [...prev, store]);
    setActiveStoreId(store.id);
    return store;
  }, []);

  const updateStore = useCallback((storeId, updates) => {
    setStores((prev) => prev.map((store) => (store.id === storeId ? { ...store, ...updates } : store)));
  }, []);

  const removeStore = useCallback((storeId) => {
    setStores((prev) => prev.filter((store) => store.id !== storeId));
    setActiveStoreId((prev) => (prev === storeId ? null : prev));
  }, []);

  const addMaterialsToStore = useCallback((storeId, materialKeys) => {
    setStores((prev) =>
      prev.map((store) => {
        if (store.id !== storeId) return store;
        const newKeys = materialKeys.filter((key) => !store.materialKeys.includes(key));
        const materialData = { ...store.materialData };
        newKeys.forEach((key) => {
          const definition = getMaterialDefinition(key);
          materialData[key] = definition?.bulk ? { price: null, available: true } : { brands: [] };
        });
        return { ...store, materialKeys: [...store.materialKeys, ...newKeys], materialData };
      }),
    );
  }, []);

  const removeMaterialFromStore = useCallback((storeId, materialKey) => {
    setStores((prev) =>
      prev.map((store) => {
        if (store.id !== storeId) return store;
        const materialData = { ...store.materialData };
        delete materialData[materialKey];
        return { ...store, materialKeys: store.materialKeys.filter((key) => key !== materialKey), materialData };
      }),
    );
  }, []);

  const updateBulkMaterial = useCallback((storeId, materialKey, updates) => {
    setStores((prev) =>
      prev.map((store) => {
        if (store.id !== storeId) return store;
        return {
          ...store,
          materialData: {
            ...store.materialData,
            [materialKey]: { ...store.materialData[materialKey], ...updates },
          },
        };
      }),
    );
  }, []);

  const addBrand = useCallback((storeId, materialKey, brand) => {
    const newBrand = { id: makeId(), ...brand };
    setStores((prev) =>
      prev.map((store) => {
        if (store.id !== storeId) return store;
        const current = store.materialData[materialKey] ?? { brands: [] };
        return {
          ...store,
          materialData: {
            ...store.materialData,
            [materialKey]: { ...current, brands: [...current.brands, newBrand] },
          },
        };
      }),
    );
    return newBrand;
  }, []);

  const updateBrand = useCallback((storeId, materialKey, brandId, updates) => {
    setStores((prev) =>
      prev.map((store) => {
        if (store.id !== storeId) return store;
        const current = store.materialData[materialKey];
        if (!current) return store;
        return {
          ...store,
          materialData: {
            ...store.materialData,
            [materialKey]: {
              ...current,
              brands: current.brands.map((brand) => (brand.id === brandId ? { ...brand, ...updates } : brand)),
            },
          },
        };
      }),
    );
  }, []);

  const removeBrand = useCallback((storeId, materialKey, brandId) => {
    setStores((prev) =>
      prev.map((store) => {
        if (store.id !== storeId) return store;
        const current = store.materialData[materialKey];
        if (!current) return store;
        return {
          ...store,
          materialData: {
            ...store.materialData,
            [materialKey]: { ...current, brands: current.brands.filter((brand) => brand.id !== brandId) },
          },
        };
      }),
    );
  }, []);

  const activeStore = useMemo(() => stores.find((store) => store.id === activeStoreId) ?? null, [stores, activeStoreId]);

  const totalBrandsConfigured = useMemo(
    () =>
      stores.reduce((sum, store) => {
        return (
          sum +
          Object.values(store.materialData).reduce((inner, data) => {
            if (data.brands) return inner + data.brands.length;
            return inner + (data.price != null ? 1 : 0);
          }, 0)
        );
      }, 0),
    [stores],
  );

  const value = useMemo(
    () => ({
      stores,
      activeStoreId,
      activeStore,
      totalBrandsConfigured,
      setActiveStoreId,
      addStore,
      updateStore,
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
      totalBrandsConfigured,
      addStore,
      updateStore,
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

import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import BudgetBadge from '../features/projects/components/BudgetBadge';
import BomTable from '../features/billOfMaterials/components/BomTable';
import BomCostSummaryCard from '../features/billOfMaterials/components/BomCostSummaryCard';
import IncompleteBomState from '../features/billOfMaterials/components/IncompleteBomState';
import NoActiveProjectState from '../features/projects/components/NoActiveProjectState';
import { useProjects } from '../context/ProjectsContext';
import { useDashboardActivity } from '../context/DashboardActivityContext';
import { useToast } from '../context/ToastContext';
import { computeTierTotal } from '../features/brandSelection/utils/computeBom';
import { loadBrandCatalog } from '../features/brandSelection/data/brandOptionsCache';
import { STORES, loadStores } from '../features/storeLocator/data/storesCache';
import { cheapestFullStore } from '../features/storeLocator/utils/budgetCheck';
import { loadParsedProject, formatQuantityLabel } from '../features/projects/data/parsedProjectCache';
import { apiRequest } from '../services/apiClient';
import { generateBomPdf } from '../services/bomPdfService';
import { ROUTES } from '../routes/paths';
import { formatPeso, formatAmount } from '../utils/formatNumbers';

/**
 * Adapts GET /projects/:id/bom to what BomTable and bomPdfService read. The
 * backend sends everything except `quantityLabel` and the trimmed material
 * name, so those are derived here. `category` and `brand` are null when a
 * material has no priced row, so they are defaulted (the PDF table needs strings).
 */
function toDisplayLineItems(lineItems) {
  return lineItems.map((item) => ({
    ...item,
    material: item.material.replace(/\s*\(.*\)$/, ''),
    category: item.category ?? '',
    brand: item.brand ?? '',
    quantityLabel: formatQuantityLabel(item.quantity, item.unit),
  }));
}

/**
 * Bill of Materials: the final priced list and a cost breakdown against the
 * budget ceiling. It loads everything itself (estimation, the selected store's
 * brand catalog, the store list and the priced BOM), so it works after a reload.
 * Line items and the grand total come from the backend (GET /:id/bom), not
 * computeBom.js, because computeBom.js prices sand and gravel from flat
 * BASE_PRICING and would not match the Store Locator total for stores with a
 * price multiplier. The backend also keeps the saved brand selection after a
 * reload (brandSelection is only in React state on the client).
 */
function BillOfMaterialsPage() {
  const { activeProject, refreshActiveProjectEstimation } = useProjects();
  const { logActivity } = useDashboardActivity();
  const { showToast } = useToast();
  // Which load already showed the over budget popup, so it shows once per load.
  const budgetWarnedFor = useRef(null);
  const [loadedForKey, setLoadedForKey] = useState(null);
  const [bom, setBom] = useState(null);

  const storeId = activeProject?.selectedStoreId ?? null;
  const materialEstimationDone = activeProject?.status !== 'Parsing' && activeProject?.status !== 'Failed';
  const stepsComplete = Boolean(activeProject) && materialEstimationDone && Boolean(storeId);
  const loadKey = typeof activeProject?.id === 'number' && storeId ? `${activeProject.id}-${storeId}` : null;
  const ready = loadKey != null && loadedForKey === loadKey;

  useEffect(() => {
    if (!activeProject || typeof activeProject.id !== 'number' || !storeId) return undefined;
    let cancelled = false;

    (async () => {
      const estimation = activeProject.estimation ?? (await refreshActiveProjectEstimation());
      if (cancelled) return;
      if (estimation) loadParsedProject(estimation);

      // The brand catalog is still needed: the Premium subtotal below has no
      // backend equivalent (the endpoint prices only the saved selection).
      const [{ catalog }, { stores }, fetchedBom] = await Promise.all([
        apiRequest(`/projects/${activeProject.id}/brand-catalog?storeId=${storeId}`),
        apiRequest(`/projects/${activeProject.id}/stores`),
        apiRequest(`/projects/${activeProject.id}/bom?storeId=${storeId}`),
      ]);
      if (cancelled) return;
      loadBrandCatalog(storeId, catalog);
      loadStores(stores);
      setBom({ ...fetchedBom, lineItems: toDisplayLineItems(fetchedBom.lineItems) });
      setLoadedForKey(`${activeProject.id}-${storeId}`);
    })().catch(() => {
      // Leaves `bom` null, which shows IncompleteBomState instead of an error
      // (covers the endpoint's 400 for no store and 409 for no estimate).
      if (!cancelled) setLoadedForKey(`${activeProject.id}-${storeId}`);
    });

    return () => {
      cancelled = true;
    };
  }, [activeProject?.id, storeId, refreshActiveProjectEstimation]);

  // Popup when the grand total is more than the budget ceiling the user entered.
  const ceilingForWarning = Number(String(activeProject?.budgetCeiling ?? '').replace(/,/g, ''));
  const totalForWarning = bom?.grandTotal;
  useEffect(() => {
    if (!ready || totalForWarning == null) return;
    if (!Number.isFinite(ceilingForWarning) || ceilingForWarning <= 0 || totalForWarning <= ceilingForWarning) return;
    const key = `${loadKey}-${totalForWarning}`;
    if (budgetWarnedFor.current === key) return;
    budgetWarnedFor.current = key;
    // FR-4: also name the closest option (cheapest brands at the cheapest
    // fully stocked store), or say that none fits.
    // A partly stocked store's total leaves items out, so it is not compared
    // with the closest store's total; only "already the closest" skips naming it.
    const closest = cheapestFullStore(STORES);
    const alreadyClosest = closest && closest.id === storeId && Math.abs(closest.totalCost - totalForWarning) < 1;
    let suggestion = ' No store fits the ceiling.';
    if (closest && closest.totalCost <= ceilingForWarning) {
      suggestion = ` Within budget: the cheapest brands at ${closest.name}, ${formatPeso(closest.totalCost)}.`;
    } else if (alreadyClosest) {
      suggestion = ' No store fits the ceiling, even with the cheapest brands.';
    } else if (closest) {
      suggestion = ` No store fits the ceiling. The closest is the cheapest brands at ${closest.name}, ${formatPeso(closest.totalCost)}.`;
    }
    showToast(
      `Budget ceiling is not enough: the total ${formatPeso(totalForWarning)} is ${formatPeso(totalForWarning - ceilingForWarning)} over your ${formatPeso(ceilingForWarning)} ceiling.${suggestion}`,
      'warning',
      10000,
    );
  }, [ready, loadKey, storeId, totalForWarning, ceilingForWarning, showToast]);

  if (!activeProject) {
    return <NoActiveProjectState />;
  }

  if (!stepsComplete) {
    const nextRoute = !materialEstimationDone ? ROUTES.MATERIAL_ESTIMATION : ROUTES.STORE_LOCATOR;
    return <IncompleteBomState nextRoute={nextRoute} />;
  }

  if (!ready) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 240 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!bom) {
    return <IncompleteBomState nextRoute={ROUTES.STORE_LOCATOR} />;
  }

  const { lineItems, grandTotal } = bom;
  // The selected store may not carry everything (StoreLocatorPage allows partial
  // stores). grandTotal only covers what it sells, so the budget check must say so.
  const missingCount = lineItems.filter((item) => item.available === false).length;
  // Price the Premium baseline with the same per-store prices as the fetched BOM,
  // so sand and gravel (no brands) don't use BASE_PRICING's flat prices. Lumber's
  // BOM line is in pieces while computeBom.js prices board feet, so leave it out
  // and let that side use the catalog per-board-foot price.
  const realUnitPrices = Object.fromEntries(
    lineItems.filter((item) => !item.pieceConversion).map((item) => [item.key, item.unitPrice]),
  );
  const premiumTotal = computeTierTotal('premium', storeId, realUnitPrices);
  const saving = Math.max(0, premiumTotal - grandTotal);

  const ceilingValue = Number(String(activeProject.budgetCeiling).replace(/,/g, ''));
  const withinBudget = !Number.isFinite(ceilingValue) || ceilingValue === 0 || grandTotal <= ceilingValue;
  const ceilingDelta = Math.abs(ceilingValue - grandTotal);
  const ceilingDeltaLabel = `${formatPeso(ceilingDelta)} ${withinBudget ? 'under' : 'over'} ceiling`;
  // The ceiling the user entered on New Project. Not shown if none was set.
  const ceilingLabel = Number.isFinite(ceilingValue) && ceilingValue > 0 ? formatPeso(ceilingValue) : null;

  const selectedStore = STORES.find((store) => store.id === storeId) ?? STORES[0] ?? { name: 'Selected store' };
  const summaryTags = [
    `${activeProject.storeys} ${activeProject.storeys === 1 ? 'storey' : 'storeys'}`,
    ...(activeProject.includeRoofing ? ['roofing'] : []),
    selectedStore.name,
    'materials only',
  ];

  // Set under Design parameters > Formwork & Scaffolding; shown in the PDF.
  const formworkUses = bom.formworkUses ?? 1;

  const handleDownloadPdf = () => {
    generateBomPdf({
      projectName: activeProject.projectName,
      projectInfo: [
        { label: 'Location', value: activeProject.location },
        { label: 'Storeys', value: `${activeProject.storeys} ${activeProject.storeys === 1 ? 'storey' : 'storeys'}` },
        { label: 'Roofing', value: activeProject.includeRoofing ? 'Included' : 'Not included' },
        { label: 'Store', value: selectedStore.name },
        // "Php", since the PDF fonts have no peso sign (see bomPdfService.js).
        ...(ceilingLabel ? [{ label: 'Budget ceiling', value: `Php ${formatAmount(ceilingValue)}` }] : []),
        ...(formworkUses > 1 ? [{ label: 'Formwork uses', value: `${formworkUses} (plywood and lumber price / ${formworkUses})` }] : []),
      ],
      lineItems,
      grandTotal,
    });
    logActivity({ type: 'pdf_downloaded', message: `Downloaded PDF report for ${activeProject.projectName}` });
  };

  return (
    // Mobile: not forced to fill the viewport (`flex:1`), since the material groups
    // are closed by default and it left an empty gap. sm+ keeps flex:1.
    <Stack spacing={2.5} sx={{ flex: { xs: 'unset', sm: 1 }, minHeight: { xs: 'auto', sm: 0 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.4rem' }, color: 'text.primary' }}>
            {activeProject.projectName}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>{summaryTags.join(' · ')}</Typography>
        </Box>

        <BudgetBadge withinBudget={withinBudget} />
      </Stack>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: 'common.white',
          boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
          p: { xs: 1.5, md: 4 },
          // 'auto' so a card shorter than its content (table + cost summary) scrolls
          // instead of spilling past the white card (same as ManualBrandTable.jsx).
          overflow: 'auto',
          flex: 1,
          minHeight: 0,
        }}
      >
        <Stack spacing={{ xs: 2, md: 3 }}>
          <BomTable items={lineItems} />

          <BomCostSummaryCard
            ceilingLabel={ceilingLabel}
            subtotalLabel={formatPeso(premiumTotal)}
            savingLabel={`–${formatPeso(saving)}`}
            grandTotalLabel={formatPeso(grandTotal)}
            ceilingDeltaLabel={ceilingDeltaLabel}
            withinBudget={withinBudget}
            missingCount={missingCount}
            onDownloadPdf={handleDownloadPdf}
          />
        </Stack>
      </Paper>
    </Stack>
  );
}

export default BillOfMaterialsPage;

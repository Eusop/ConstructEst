import { useEffect, useState } from 'react';
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
import { useNotifications } from '../context/NotificationsContext';
import { computeTierTotal } from '../features/brandSelection/utils/computeBom';
import { loadBrandCatalog } from '../features/brandSelection/data/brandOptionsMock';
import { STORES, loadStores } from '../features/storeLocator/data/storesMock';
import { loadParsedProject, formatQuantityLabel } from '../features/projects/data/parsedProjectMock';
import { apiRequest } from '../services/apiClient';
import { generateBomPdf } from '../services/bomPdfService';
import { ROUTES } from '../routes/paths';

function formatPeso(value) {
  return `₱${Math.round(value).toLocaleString('en-PH')}`;
}

/**
 * Adapts GET /projects/:id/bom to what BomTable and bomPdfService read. The
 * backend sends everything they need except `quantityLabel`, and it sends the
 * full material name where the table shows the trimmed one, so those two are
 * derived here. `category`/`brand` come back null when no priced row was
 * found for a material, and the PDF passes category straight into
 * jspdf-autotable, so both are defaulted rather than left null.
 */
function toDisplayLineItems(lineItems) {
  return lineItems.map((item) => ({
    ...item,
    material: item.material.replace(/\s*\(.*\)$/, ''),
    category: item.category ?? '',
    brand: item.brand ?? '',
    quantityLabel: formatQuantityLabel(item.quantity),
  }));
}

/**
 * Bill of Materials: the final priced material list plus a cost breakdown
 * against the project's budget ceiling. Self-sufficient regardless of which
 * page the user arrived from (or a reload): fetches the active project's
 * estimation, its selected store's real brand catalog, the store list, and
 * the priced BOM itself.
 *
 * The line items and grand total come from the backend (GET /:id/bom), not
 * from computeBom.js. That matters because computeBom prices sand and gravel
 * from flat BASE_PRICING literals — they're commodities with no brand
 * catalog — while the backend prices every material from store_material_prices,
 * which is per-store. The two therefore disagreed for any store whose price
 * multiplier isn't 1.0, so this page's grand total didn't match the total the
 * Store Locator showed for the same project. Fetching it also means a saved
 * manual brand selection survives a reload: brandSelection lives only in
 * React state (ProjectsContext hardcodes it to null), so the client-side
 * version silently fell back to the Standard tier after a refresh, while the
 * backend still had the user's real picks.
 */
function BillOfMaterialsPage() {
  const { activeProject, refreshActiveProjectEstimation } = useProjects();
  const { logActivity } = useDashboardActivity();
  const { addNotification } = useNotifications();
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

      // The brand catalog is still needed even though the BOM is now priced
      // server-side: the Premium subtotal below has no backend equivalent
      // (the endpoint prices the *saved* selection, it can't answer "what
      // would Premium have cost"), so that one figure is still computed here.
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
      // Leaves `bom` null, which renders IncompleteBomState below rather than
      // an error screen — covers the endpoint's own 400 (no store selected
      // and none saved) and 409 (no current estimation yet).
      if (!cancelled) setLoadedForKey(`${activeProject.id}-${storeId}`);
    });

    return () => {
      cancelled = true;
    };
  }, [activeProject?.id, storeId, refreshActiveProjectEstimation]);

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
  // Price the Premium baseline off the same real per-store prices the fetched
  // BOM used, so the commodities (sand/gravel, which have no brand options and
  // would otherwise fall back to BASE_PRICING's flat literals) don't drag a
  // stale number into the saving figure.
  const realUnitPrices = Object.fromEntries(lineItems.map((item) => [item.key, item.unitPrice]));
  const premiumTotal = computeTierTotal('premium', storeId, realUnitPrices);
  const saving = Math.max(0, premiumTotal - grandTotal);

  const ceilingValue = Number(String(activeProject.budgetCeiling).replace(/,/g, ''));
  const withinBudget = !Number.isFinite(ceilingValue) || ceilingValue === 0 || grandTotal <= ceilingValue;
  const ceilingDelta = Math.abs(ceilingValue - grandTotal);
  const ceilingDeltaLabel = `${formatPeso(ceilingDelta)} ${withinBudget ? 'under' : 'over'} ceiling`;

  const selectedStore = STORES.find((store) => store.id === storeId) ?? STORES[0] ?? { name: 'Selected store' };
  const summaryTags = [
    `${activeProject.storeys} ${activeProject.storeys === 1 ? 'storey' : 'storeys'}`,
    ...(activeProject.includeRoofing ? ['roofing'] : []),
    selectedStore.name,
    'materials only',
  ];

  const handleDownloadPdf = () => {
    generateBomPdf({
      projectName: activeProject.projectName,
      projectInfo: [
        { label: 'Location', value: activeProject.location },
        { label: 'Storeys', value: `${activeProject.storeys} ${activeProject.storeys === 1 ? 'storey' : 'storeys'}` },
        { label: 'Roofing', value: activeProject.includeRoofing ? 'Included' : 'Not included' },
        { label: 'Store', value: selectedStore.name },
      ],
      lineItems,
      grandTotal,
    });
    logActivity({ type: 'pdf_downloaded', message: `Downloaded PDF report for ${activeProject.projectName}` });
    addNotification({
      type: 'pdf_downloaded',
      title: 'PDF report downloaded',
      description: `Bill of Materials report for ${activeProject.projectName} was downloaded.`,
    });
  };

  return (
    // Mobile: no longer forced to stretch and fill the viewport (`flex:1`)
    // — with the material category groups now closed by default, that
    // forced stretch left a large empty gap below the short collapsed
    // content instead of the page simply ending at its natural height.
    // sm+ keeps the original flex:1 behavior unchanged.
    <Stack spacing={2.5} sx={{ flex: { xs: 'unset', sm: 1 }, minHeight: { xs: 'auto', sm: 0 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.4rem' }, color: 'text.primary' }}>
            {activeProject.projectName}: Bill of Materials
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
          // 'auto' rather than leaving overflow unset (default 'visible') —
          // without a scroll boundary, this card renders shorter than its
          // actual content (table + cost summary) once flex-sized, and the
          // table's later rows/the summary box spill past the white card's
          // bottom edge instead of scrolling within it (same risk as
          // ManualBrandTable.jsx's identical Paper shape).
          overflow: 'auto',
          flex: 1,
          minHeight: 0,
        }}
      >
        <Stack spacing={{ xs: 2, md: 3 }}>
          <BomTable items={lineItems} />

          <BomCostSummaryCard
            subtotalLabel={formatPeso(premiumTotal)}
            savingLabel={`–${formatPeso(saving)}`}
            grandTotalLabel={formatPeso(grandTotal)}
            ceilingDeltaLabel={ceilingDeltaLabel}
            withinBudget={withinBudget}
            onDownloadPdf={handleDownloadPdf}
          />
        </Stack>
      </Paper>
    </Stack>
  );
}

export default BillOfMaterialsPage;

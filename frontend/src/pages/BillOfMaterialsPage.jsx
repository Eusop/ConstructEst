import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import BudgetBadge from '../features/projects/components/BudgetBadge';
import BomTable from '../features/billOfMaterials/components/BomTable';
import BomCostSummaryCard from '../features/billOfMaterials/components/BomCostSummaryCard';
import NoActiveProjectState from '../features/projects/components/NoActiveProjectState';
import { useProjects } from '../context/ProjectsContext';
import { useDashboardActivity } from '../context/DashboardActivityContext';
import { useNotifications } from '../context/NotificationsContext';
import { computeBomForProject, computeTierTotal } from '../features/brandSelection/utils/computeBom';
import { loadBrandCatalog } from '../features/brandSelection/data/brandOptionsMock';
import { STORES, loadStores } from '../features/storeLocator/data/storesMock';
import { loadParsedProject } from '../features/projects/data/parsedProjectMock';
import { apiRequest } from '../services/apiClient';
import { generateBomPdf } from '../services/bomPdfService';

function formatPeso(value) {
  return `₱${Math.round(value).toLocaleString('en-PH')}`;
}

/**
 * Bill of Materials: the final priced material list plus a cost breakdown
 * against the project's budget ceiling. Self-sufficient regardless of which
 * page the user arrived from (or a reload): fetches the active project's
 * estimation, its selected store's real brand catalog, and the store list,
 * then computes the priced BOM the same way Brand Selection's live preview
 * does (see computeBom.js) so the two always agree.
 */
function BillOfMaterialsPage() {
  const { activeProject, refreshActiveProjectEstimation } = useProjects();
  const { logActivity } = useDashboardActivity();
  const { addNotification } = useNotifications();
  const [loadedForKey, setLoadedForKey] = useState(null);

  const storeId = activeProject?.selectedStoreId ?? null;
  const loadKey = typeof activeProject?.id === 'number' && storeId ? `${activeProject.id}-${storeId}` : null;
  const ready = loadKey != null && loadedForKey === loadKey;

  useEffect(() => {
    if (!activeProject || typeof activeProject.id !== 'number' || !storeId) return undefined;
    let cancelled = false;

    (async () => {
      const estimation = activeProject.estimation ?? (await refreshActiveProjectEstimation());
      if (cancelled) return;
      if (estimation) loadParsedProject(estimation);

      const [{ catalog }, { stores }] = await Promise.all([
        apiRequest(`/projects/${activeProject.id}/brand-catalog?storeId=${storeId}`),
        apiRequest(`/projects/${activeProject.id}/stores`),
      ]);
      if (cancelled) return;
      loadBrandCatalog(storeId, catalog);
      loadStores(stores);
      setLoadedForKey(`${activeProject.id}-${storeId}`);
    })().catch(() => {
      if (!cancelled) setLoadedForKey(`${activeProject.id}-${storeId}`);
    });

    return () => {
      cancelled = true;
    };
  }, [activeProject?.id, storeId, refreshActiveProjectEstimation]);

  if (!activeProject) {
    return <NoActiveProjectState />;
  }

  if (!ready) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 240 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const { lineItems, grandTotal } = computeBomForProject(activeProject);
  const premiumTotal = computeTierTotal('premium', storeId);
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
    <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: 'text.primary' }}>
            {activeProject.projectName} — Bill of Materials
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>{summaryTags.join(' · ')}</Typography>
        </Box>

        <BudgetBadge withinBudget={withinBudget} />
      </Stack>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: 'common.white',
          boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
          p: { xs: 2.5, md: 4 },
          flex: 1,
          minHeight: 0,
        }}
      >
        <Stack spacing={3}>
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

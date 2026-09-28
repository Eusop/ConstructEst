import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import NoActiveProjectState from '../features/projects/components/NoActiveProjectState';
import NoStoreSelectedState from '../features/brandSelection/components/NoStoreSelectedState';
import BrandModeToggle from '../features/brandSelection/components/BrandModeToggle';
import OptimizationTierCards from '../features/brandSelection/components/OptimizationTierCards';
import RecommendedBrandsSummary from '../features/brandSelection/components/RecommendedBrandsSummary';
import ManualBrandTable from '../features/brandSelection/components/ManualBrandTable';
import { useProjects } from '../context/ProjectsContext';
import { useDashboardActivity } from '../context/DashboardActivityContext';
import { OPTIMIZATION_TIERS, loadBrandCatalog } from '../features/brandSelection/data/brandOptionsCache';
import { computeBom } from '../features/brandSelection/utils/computeBom';
import { apiRequest } from '../services/apiClient';
import { ROUTES } from '../routes/paths';
import { colors } from '../theme/palette';
import { formatPeso } from '../utils/formatNumbers';

/**
 * Brand Selection: choose the brand for each shoppable material, with an
 * Automatic tier preset (Premium/Standard/Budget) or Manual dropdowns. It needs
 * a selected store, since brands and prices come from that store's catalog
 * (GET /api/projects/:id/brand-catalog, loaded into brandOptionsCache).
 * "Continue" saves the choice with POST /api/projects/:id/brand-selection.
 */
function BrandSelectionPage() {
  const { activeProject, updateActiveProject } = useProjects();
  const { logActivity } = useDashboardActivity();
  const navigate = useNavigate();

  const storeId = activeProject?.selectedStoreId ?? null;
  const [loadedForStoreId, setLoadedForStoreId] = useState(null);
  const catalogReady = storeId != null && loadedForStoreId === storeId;
  const [isSaving, setIsSaving] = useState(false);
  // materialKey -> this store's real price, from the backend BOM. Only used for
  // materials without brand options (sand, gravel), which would otherwise use
  // BASE_PRICING's flat prices. Null until loaded or if the request fails.
  const [realUnitPrices, setRealUnitPrices] = useState(null);

  const initialSelection = activeProject?.brandSelection;
  const [mode, setMode] = useState(initialSelection?.mode ?? 'automatic');
  const [tier, setTier] = useState(initialSelection?.tier ?? 'standard');
  const [choices, setChoices] = useState(initialSelection?.choices ?? null);

  useEffect(() => {
    if (!activeProject || typeof activeProject.id !== 'number' || !storeId) return undefined;
    let cancelled = false;

    apiRequest(`/projects/${activeProject.id}/brand-catalog?storeId=${storeId}`)
      .then(({ catalog }) => {
        if (cancelled) return;
        loadBrandCatalog(storeId, catalog);
        setChoices((prev) => prev ?? OPTIMIZATION_TIERS.standard.choices);
        setLoadedForStoreId(storeId);
      })
      .catch(() => {
        if (!cancelled) setLoadedForStoreId(storeId);
      });

    // Separate request so the page still works if it fails (totals fall back to
    // BASE_PRICING). Brand picks don't change it, so it isn't refetched.
    apiRequest(`/projects/${activeProject.id}/bom?storeId=${storeId}`)
      .then(({ lineItems }) => {
        if (cancelled) return;
        setRealUnitPrices(Object.fromEntries(lineItems.map((item) => [item.key, item.unitPrice])));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [activeProject?.id, storeId]);

  const { lineItems, grandTotal } = useMemo(
    () => (catalogReady && choices ? computeBom(choices, storeId, realUnitPrices) : { lineItems: [], grandTotal: 0 }),
    [choices, storeId, catalogReady, realUnitPrices],
  );

  if (!activeProject) {
    return <NoActiveProjectState />;
  }

  if (!storeId) {
    return <NoStoreSelectedState />;
  }

  if (!catalogReady || !choices) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 240 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const handleSelectTier = (tierKey) => {
    setTier(tierKey);
    setChoices(OPTIMIZATION_TIERS[tierKey].choices);
  };

  const handleManualChoiceChange = (materialKey, optionId) => {
    setChoices((prev) => ({ ...prev, [materialKey]: optionId }));
  };

  const handleContinue = async () => {
    const brandSelection = { mode, tier: mode === 'automatic' ? tier : null, choices };
    setIsSaving(true);
    try {
      const bom = await apiRequest(`/projects/${activeProject.id}/brand-selection`, {
        method: 'POST',
        body: { storeId, choices },
      });
      updateActiveProject({ brandSelection, status: 'Optimized', bom });
      logActivity({
        type: 'brand_selection_completed',
        message: `Selected brands (${mode === 'automatic' ? OPTIMIZATION_TIERS[tier].label : 'Manual'}) for ${activeProject.projectName}`,
      });
      logActivity({ type: 'bom_generated', message: `Generated Bill of Materials for ${activeProject.projectName}` });
      navigate(ROUTES.BILL_OF_MATERIALS);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    // Mobile: not stretched to fill the viewport (`flex:1`), since the tier
    // cards are closed by default and it left an empty gap. sm+ keeps flex:1.
    <Stack spacing={2.5} sx={{ flex: { xs: 'unset', sm: 1 }, minHeight: { xs: 'auto', sm: 0 }, minWidth: 0 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.4rem' }, color: 'text.primary' }}>Brand selection</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
            Choose the brands you want for your materials.
          </Typography>
        </Box>

        <BrandModeToggle mode={mode} onModeChange={setMode} />
      </Stack>

      {mode === 'automatic' ? (
        // No flex:1/minHeight:0 here (unlike the manual branch): both children are
        // natural-height content, and shrinking this wrapper let the "Continue"
        // button spill on top of the cards.
        <Stack spacing={2.5} sx={{ minWidth: 0 }}>
          <OptimizationTierCards selectedTier={tier} onSelectTier={handleSelectTier} storeId={storeId} realUnitPrices={realUnitPrices} />
          <RecommendedBrandsSummary tierKey={tier} grandTotal={grandTotal} storeId={storeId} />
        </Stack>
      ) : (
        <Stack spacing={2.5} sx={{ flex: { xs: 'unset', sm: 1 }, minHeight: { xs: 'auto', sm: 0 }, minWidth: 0 }}>
          <ManualBrandTable
            choices={choices}
            onChoiceChange={handleManualChoiceChange}
            storeId={storeId}
            lineItems={lineItems}
            grandTotal={grandTotal}
            onContinue={handleContinue}
            isSaving={isSaving}
          />

          {/* Mobile only: a white card with the total in its own accent box, then
              a full-width button. sm+ has its own footer inside ManualBrandTable. */}
          <Paper
            elevation={0}
            sx={{ display: { xs: 'block', sm: 'none' }, borderRadius: 3, bgcolor: 'common.white', boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)', p: 2 }}
          >
            <Box sx={{ textAlign: 'center', bgcolor: colors.iconBlueBg, borderRadius: 2, py: 1.5, px: 2, mb: 1.5 }}>
              <Typography sx={{ fontSize: '0.72rem', color: colors.iconBlueFg, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                Estimated total
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: '1.6rem', color: 'text.primary', mt: 0.25 }}>
                {formatPeso(grandTotal)}
              </Typography>
            </Box>

            <Button
              fullWidth
              onClick={handleContinue}
              variant="contained"
              disableElevation
              disabled={isSaving}
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{
                bgcolor: colors.accentBlue,
                '&:hover': { bgcolor: colors.accentBlueDark },
                fontSize: '0.9rem',
              }}
            >
              Continue to Bill of Materials
            </Button>
          </Paper>
        </Stack>
      )}

      {mode === 'automatic' && (
        <Box sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end' }, pb: { xs: 2, sm: 3 } }}>
          <Button
            onClick={handleContinue}
            variant="contained"
            disableElevation
            disabled={isSaving}
            endIcon={<ArrowForwardRoundedIcon />}
            sx={{
              bgcolor: colors.accentBlue,
              '&:hover': { bgcolor: colors.accentBlueDark },
              fontSize: { xs: '0.9rem', sm: '1.05rem' },
              // Full-width primary CTA on phones, like the Manual tab's Continue
              // button and other mobile CTAs. sm+ unchanged.
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            Continue to Bill of Materials
          </Button>
        </Box>
      )}
    </Stack>
  );
}

export default BrandSelectionPage;

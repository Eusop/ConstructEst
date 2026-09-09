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
import { useNotifications } from '../context/NotificationsContext';
import { OPTIMIZATION_TIERS, loadBrandCatalog } from '../features/brandSelection/data/brandOptionsMock';
import { computeBom } from '../features/brandSelection/utils/computeBom';
import { apiRequest } from '../services/apiClient';
import { ROUTES } from '../routes/paths';
import { colors } from '../theme/palette';
import { formatPeso } from '../utils/formatNumbers';

/**
 * Brand Selection: choose which brand each shoppable material comes from,
 * either via an Automatic tier preset (Premium/Standard/Budget) or Manual
 * per-material dropdowns. Only usable once the active project has a
 * selected store — the available brands and prices come from that store's
 * real catalog (GET /api/projects/:id/brand-catalog), loaded into
 * brandOptionsMock so OptimizationTierCards/RecommendedBrandsSummary/
 * ManualBrandTable/computeBom all resolve against real data unchanged.
 * "Continue" persists the choice via POST /api/projects/:id/brand-selection.
 */
function BrandSelectionPage() {
  const { activeProject, updateActiveProject } = useProjects();
  const { logActivity } = useDashboardActivity();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const storeId = activeProject?.selectedStoreId ?? null;
  const [loadedForStoreId, setLoadedForStoreId] = useState(null);
  const catalogReady = storeId != null && loadedForStoreId === storeId;
  const [isSaving, setIsSaving] = useState(false);
  // materialKey -> this store's real price, read off the backend's own BOM.
  // Only actually consulted for materials with no brand options (sand and
  // gravel), whose prices would otherwise come from BASE_PRICING's flat
  // literals and disagree with what the store really charges. Null until it
  // loads, and stays null if the request fails, which just falls back to the
  // old behaviour rather than blocking the page.
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

    // Separate request on purpose: the page stays usable if this one fails,
    // and the totals just fall back to BASE_PRICING as before. The brand
    // choices don't affect what we take from it (commodities have no brands),
    // so it doesn't need refetching when the user changes a pick.
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
      addNotification({
        type: 'brand_selection_completed',
        title: 'Brand selection completed',
        description: `Brands selected (${mode === 'automatic' ? OPTIMIZATION_TIERS[tier].label : 'Manual'}) for ${activeProject.projectName}.`,
      });
      addNotification({
        type: 'bom_generated',
        title: 'Bill of Materials generated',
        description: `${activeProject.projectName}'s Bill of Materials is ready to view or download.`,
      });
      navigate(ROUTES.BILL_OF_MATERIALS);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    // Mobile: no longer stretches to fill the viewport (`flex:1`) — with
    // Optimization tier cards/accordions now closed by default, that forced
    // stretch left a large empty gap between the short collapsed content
    // and the "Continue" button/card below it, instead of the content
    // simply ending where it naturally does. sm+ keeps the original
    // flex:1 behavior unchanged.
    <Stack spacing={2.5} sx={{ flex: { xs: 'unset', sm: 1 }, minHeight: { xs: 'auto', sm: 0 }, minWidth: 0 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.4rem' }, color: 'text.primary' }}>Brand selection</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
            Choose brands for {activeProject.projectName}'s shoppable materials.
          </Typography>
        </Box>

        <BrandModeToggle mode={mode} onModeChange={setMode} />
      </Stack>

      {mode === 'automatic' ? (
        // No flex:1/minHeight:0 here (unlike the manual branch below) — both
        // children are natural-height content, not a bounded scroll panel,
        // so forcing this wrapper to shrink to the outer Stack's flex share
        // let it compute shorter than the actual card grid, spilling the
        // "Continue" button below on top of the still-overflowing cards.
        <Stack spacing={2.5} sx={{ minWidth: 0 }}>
          <OptimizationTierCards selectedTier={tier} onSelectTier={handleSelectTier} storeId={storeId} realUnitPrices={realUnitPrices} />
          <RecommendedBrandsSummary tierKey={tier} grandTotal={grandTotal} storeId={storeId} />
        </Stack>
      ) : (
        <Stack spacing={2.5} sx={{ flex: { xs: 'unset', sm: 1 }, minHeight: { xs: 'auto', sm: 0 }, minWidth: 0 }}>
          <ManualBrandTable choices={choices} onChoiceChange={handleManualChoiceChange} storeId={storeId} lineItems={lineItems} />

          {/* Mobile only: a real white card (shadow, no fill-color-on-fill-
              color blending) with the total called out in its own accent
              box, then a full-width button — vs. before, where the card's
              own background was nearly the same light blue as the page
              behind it, so it read as plain floating text with no card
              boundary at all rather than an actual card. sm+ keeps the
              single merged card below (side-by-side layout), unchanged. */}
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

          <Paper
            elevation={0}
            sx={{
              display: { xs: 'none', sm: 'block' },
              borderRadius: 3,
              bgcolor: colors.iconBlueBg,
              p: 2,
            }}
          >
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography sx={{ fontSize: '0.78rem', color: colors.iconBlueFg, fontWeight: 600 }}>
                  Estimated total
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: 'text.primary' }}>
                  {formatPeso(grandTotal)}
                </Typography>
              </Box>

              <Button
                onClick={handleContinue}
                variant="contained"
                disableElevation
                disabled={isSaving}
                endIcon={<ArrowForwardRoundedIcon />}
                sx={{
                  bgcolor: colors.accentBlue,
                  '&:hover': { bgcolor: colors.accentBlueDark },
                  flexShrink: 0,
                  fontSize: '1.05rem',
                }}
              >
                Continue to Bill of Materials
              </Button>
            </Stack>
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

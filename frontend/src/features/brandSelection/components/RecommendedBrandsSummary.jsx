import { useState } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { BRAND_MATERIAL_SHORT_LABELS, OPTIMIZATION_TIERS, getStoreBrandOptions, getAvailableMaterialKeys } from '../data/brandOptionsCache';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { colors } from '../../../theme/palette';
import { formatPeso } from '../../../utils/formatNumbers';

// Only materials this project's estimation actually needs (see
// getAvailableMaterialKeys) — not the app-wide static list, which still
// includes e.g. roofing even for a project that's toggled it off. Falls
// back to the store's cheapest option for a key the tier hasn't set a
// choice for yet, then drops anything that still can't resolve (defensive
// — shouldn't happen since availableMaterialKeys already means options
// exist) rather than rendering with an undefined option.
function resolveMaterials(choices, storeId) {
  return getAvailableMaterialKeys(storeId)
    .map((materialKey) => {
      const options = getStoreBrandOptions(storeId, materialKey);
      return { materialKey, option: options.find((item) => item.id === choices[materialKey]) ?? options[0] };
    })
    .filter(({ option }) => option);
}

/**
 * Automatic-mode body: "Recommended brands · {tier}" + the 4 brand-
 * selectable materials resolved against the chosen tier's price, plus the
 * live estimated total.
 *
 * Mobile only: the whole thing collapses into one tappable summary row
 * (name/tier + total, no material list) instead of always showing all 14
 * materials — expanding it is an explicit choice instead of the page
 * defaulting to a long scroll. Desktop/tablet render the original always-
 * expanded layout, completely unchanged.
 *
 * @param {object} props
 * @param {string} props.tierKey
 * @param {number} props.grandTotal
 * @param {string} props.storeId Which store's brand catalog to resolve prices against.
 */
function RecommendedBrandsSummary({ tierKey, grandTotal, storeId }) {
  const tier = OPTIMIZATION_TIERS[tierKey];
  const choices = tier.choices;
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);

  if (isMobile) {
    const materials = resolveMaterials(choices, storeId);
    return (
      <Accordion
        expanded={expanded}
        onChange={() => setExpanded((prev) => !prev)}
        disableGutters
        elevation={0}
        sx={{ borderRadius: '12px !important', boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)', '&:before': { display: 'none' }, overflow: 'hidden' }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreRoundedIcon />}
          sx={{ py: 0.5, '& .MuiAccordionSummary-content': { my: 1, alignItems: 'center' } }}
        >
          {/* Redesigned closed state: the tier name reads as its own clear
              label with a "tap to view all" hint instead of the slightly
              awkward "Recommended · Standard" concatenation, and the total
              is now the visually dominant element (accent color, its own
              label directly above it) since that's the number people are
              actually scanning for — not competing on equal footing with
              the tier name the way it did before. */}
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0, gap: 1.5, pr: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ fontWeight: 700, fontSize: '0.92rem', color: 'text.primary' }}>
                {tier.label} brands
              </Typography>
              <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Tap to view all</Typography>
            </Box>
            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
              <Typography sx={{ fontSize: '0.64rem', color: 'text.secondary', lineHeight: 1.4 }}>Estimated total</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: colors.accentBlue, whiteSpace: 'nowrap' }}>
                {formatPeso(grandTotal)}
              </Typography>
            </Box>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Stack spacing={1}>
            {materials.map(({ materialKey, option }) => (
              <Box key={materialKey} sx={{ borderRadius: 2, bgcolor: colors.iconBlueBg, p: 1.25 }}>
                <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                  {BRAND_MATERIAL_SHORT_LABELS[materialKey]}
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>{option.brand}</Typography>
                <Typography sx={{ fontSize: '0.72rem', color: colors.iconBlueFg, fontWeight: 600 }}>
                  {formatPeso(option.price)} · {option.spec}
                </Typography>
              </Box>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        bgcolor: 'common.white',
        boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
        p: { xs: 2, md: 3 },
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 2.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.05rem' }, color: 'text.primary' }}>
          Recommended brands · {tier.label}
        </Typography>
        <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>Estimated total</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: 'text.primary' }}>{formatPeso(grandTotal)}</Typography>
        </Box>
      </Stack>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {resolveMaterials(choices, storeId).map(({ materialKey, option }) => (
          <Box
            key={materialKey}
            sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 6px)' }, borderRadius: 2, bgcolor: colors.iconBlueBg, p: 1.75 }}
          >
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
              {BRAND_MATERIAL_SHORT_LABELS[materialKey]}
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'text.primary' }}>{option.brand}</Typography>
            <Typography sx={{ fontSize: '0.8rem', color: colors.iconBlueFg, fontWeight: 600 }}>
              {formatPeso(option.price)} · {option.spec}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

export default RecommendedBrandsSummary;

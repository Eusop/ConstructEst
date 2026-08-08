import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { BRAND_MATERIAL_SHORT_LABELS, OPTIMIZATION_TIERS, getStoreBrandOptions } from '../data/brandOptionsMock';
import { colors } from '../../../theme/palette';

function formatPeso(value) {
  return `₱${Math.round(value).toLocaleString('en-PH')}`;
}

/**
 * Automatic-mode body: "Recommended brands · {tier}" + the 4 brand-
 * selectable materials resolved against the chosen tier's price, plus the
 * live estimated total.
 *
 * @param {object} props
 * @param {string} props.tierKey
 * @param {number} props.grandTotal
 * @param {string} props.storeId Which store's brand catalog to resolve prices against.
 */
function RecommendedBrandsSummary({ tierKey, grandTotal, storeId }) {
  const tier = OPTIMIZATION_TIERS[tierKey];
  const choices = tier.choices;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        bgcolor: 'common.white',
        boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
        p: { xs: 2.5, md: 3 },
        flex: 1,
        minHeight: 320,
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 2.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: 'text.primary' }}>
          Recommended brands · {tier.label}
        </Typography>
        <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>Estimated total</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: 'text.primary' }}>{formatPeso(grandTotal)}</Typography>
        </Box>
      </Stack>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {Object.keys(BRAND_MATERIAL_SHORT_LABELS).map((materialKey) => {
          const option = getStoreBrandOptions(storeId, materialKey).find((item) => item.id === choices[materialKey]);
          return (
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
          );
        })}
      </Box>
    </Paper>
  );
}

export default RecommendedBrandsSummary;

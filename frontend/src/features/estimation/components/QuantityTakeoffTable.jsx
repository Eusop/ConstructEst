import { useState } from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import FactorsAppliedBanner from './FactorsAppliedBanner';
import { colors } from '../../../theme/palette';
import { QUANTITY_TAKEOFF_MATERIALS } from '../data/quantityTakeoffMaterials';
import { groupMaterialsByCategory } from '../../../data/materialCategories';

const COLUMNS = ['MATERIAL', 'BASIS', 'QUANTITY', 'UNIT', 'UNIT COST', 'TOTAL COST'];

// "By source" grouping — see backend/engine/formulas.py's SOURCE_CATEGORIES.
// "Roofing" and "Shared / Whole building" aren't floors; they're honest
// labels for contributions that don't belong to one floor at all (a column
// runs continuously through both, a footing is foundation-level, a roof
// sits above the top floor) — forcing those into "Ground"/"Second" would
// be a fake-precise split.
const SOURCE_CATEGORY_META = [
  { key: 'ground', label: 'Ground floor' },
  { key: 'second', label: 'Second floor' },
  { key: 'roofing', label: 'Roofing' },
  { key: 'shared', label: 'Shared / Whole building' },
];

function formatQty(value) {
  return Number(value).toLocaleString('en-PH', { maximumFractionDigits: 3 });
}

// Splits each material's total into its 4 source buckets, keeping only
// materials that actually contributed to that bucket. Per-bucket quantities
// are plain-rounded (not ceiling'd like the grand total), so they won't
// always sum to exactly the "Total" view's number — same as any real BOQ's
// subtotals rounding independently.
function buildSourceGroups(materials) {
  return SOURCE_CATEGORY_META.map(({ key, label }) => ({
    key,
    label,
    items: materials
      .filter((material) => (material.sourceBreakdown?.[key] ?? 0) > 0)
      .map((material) => {
        const categoryQuantity = material.sourceBreakdown[key];
        return { ...material, quantity: categoryQuantity, quantityLabel: formatQty(categoryQuantity), totalCost: categoryQuantity * material.unitCost };
      }),
  })).filter((group) => group.items.length > 0);
}

const DOT_COLORS = {
  blue: colors.iconBlueFg,
  orange: colors.iconOrangeFg,
  green: colors.iconGreenFg,
  teal: colors.iconTealFg,
  purple: colors.iconPurpleFg,
};

function formatPeso(value) {
  return `₱${Math.round(value).toLocaleString('en-PH')}`;
}

function StatCell({ label, value }) {
  return (
    <Box>
      <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.primary' }}>{value}</Typography>
    </Box>
  );
}

function MaterialMobileCard({ material }) {
  return (
    <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 1.75 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: DOT_COLORS[material.color], flexShrink: 0 }} />
          <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.92rem' }}>{material.name}</Typography>
        </Stack>
        <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
          {formatPeso(material.totalCost)}
        </Typography>
      </Stack>

      <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem', mt: 0.5, mb: 1.25 }}>{material.basis}</Typography>

      <Divider sx={{ mb: 1.25 }} />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
        <StatCell label="Quantity" value={material.quantityLabel} />
        <StatCell label="Unit" value={material.unit} />
        <StatCell label="Unit cost" value={formatPeso(material.unitCost)} />
      </Box>
    </Paper>
  );
}

// CHB is the one row whose basis text calls out the storeys count (the way
// "Footings + slabs (2 flr)" used to for concrete) — every other material's
// basis is a fixed description of how the rule-based engine derives it.
function buildMaterials(storeys) {
  return QUANTITY_TAKEOFF_MATERIALS.map((material) => ({
    ...material,
    basis: material.key === 'hollowBlocks' ? `Wall area (${storeys} flr) ÷ coverage` : material.basis,
    totalCost: material.quantity * material.unitCost,
  }));
}

/**
 * Itemized material quantity take-off table, derived from the parsed floor
 * plan measurements and calibration factors — covers the full structural
 * material list the rule-based estimation engine produces (see
 * QUANTITY_TAKEOFF_MATERIALS), with a mock unit/total cost per row until
 * real pricing is wired in. Scrolls horizontally on narrow viewports
 * instead of clipping.
 *
 * @param {object} props
 * @param {number} props.storeys Used to label the CHB basis (e.g. "(2 flr)").
 * @param {{cement: number, steel: number, roofing: number, wastage: number}} props.factors
 * @param {() => void} props.onContinue Called when "Continue to Store Locator" is clicked.
 */
function QuantityTakeoffTable({ storeys, factors, onContinue }) {
  const [viewMode, setViewMode] = useState('total');
  const materials = buildMaterials(storeys);
  const categoryGroups = groupMaterialsByCategory(materials);
  const sourceGroups = viewMode === 'bySource' ? buildSourceGroups(materials) : [];

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        bgcolor: 'common.white',
        boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
        overflow: 'hidden',
        flex: 1,
        minWidth: 0,
        minHeight: { xs: 0, md: 420 },
      }}
    >
      {/* Always available, not just for 2-storey/two-file projects — every
          material's sourceBreakdown already tags ground/roofing/shared
          contributions regardless of storeys (see backend/engine/formulas.py's
          SOURCE_CATEGORIES); buildSourceGroups drops any bucket with nothing
          in it, so a 1-storey project's "By source" view just naturally has
          no "Second floor" group instead of needing to be hidden outright. */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', p: { xs: 1.5, sm: 2.5 }, pb: { xs: 0.5, sm: 1 } }}
      >
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(event, value) => value !== null && setViewMode(value)}
          sx={{
            bgcolor: 'grey.100',
            borderRadius: 999,
            p: 0.5,
            '& .MuiToggleButtonGroup-grouped': {
              border: 0,
              borderRadius: 999,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              color: 'text.secondary',
              px: 1.75,
              '&.Mui-selected': { bgcolor: 'common.white', color: colors.accentBlue, boxShadow: '0 1px 4px rgba(20, 30, 60, 0.12)', '&:hover': { bgcolor: 'common.white' } },
            },
          }}
        >
          <ToggleButton value="total" disableRipple>Total</ToggleButton>
          <ToggleButton value="bySource" disableRipple>By source</ToggleButton>
        </ToggleButtonGroup>
        {viewMode === 'bySource' && (
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
            Grouped by which floor/element each material comes from — subtotals may not sum exactly to the Total view due to independent rounding.
          </Typography>
        )}
      </Stack>

      {viewMode === 'bySource' ? (
        <Stack spacing={1.25} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          {sourceGroups.map((group) => (
            <Accordion
              key={group.key}
              disableGutters
              elevation={0}
              sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: '12px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}
            >
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: 'text.primary' }}>
                  {group.label} <Typography component="span" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.78rem' }}>({group.items.length})</Typography>
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Stack spacing={1.25}>
                  {group.items.map((material) => (
                    <MaterialMobileCard key={material.key} material={material} />
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      ) : (
        <>
          <Stack spacing={1.25} sx={{ display: { xs: 'flex', md: 'none' }, p: { xs: 1.5, sm: 2.5 } }}>
            {categoryGroups.map((group) => (
              <Accordion
                key={group.label}
                // Every group starts closed on mobile — the user taps whichever
                // category they want to look at instead of the first one
                // opening automatically.
                disableGutters
                elevation={0}
                sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: '12px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}
              >
                <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: 'text.primary' }}>
                    {group.label} <Typography component="span" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.78rem' }}>({group.items.length})</Typography>
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Stack spacing={1.25}>
                    {group.items.map((material) => (
                      <MaterialMobileCard key={material.key} material={material} />
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>

          <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  {COLUMNS.map((col) => (
                    <TableCell
                      key={col}
                      sx={{ color: 'text.secondary', fontSize: '0.72rem', fontWeight: 700, letterSpacing: 0.5, borderColor: 'divider' }}
                    >
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {materials.map((material) => (
                  <TableRow key={material.key} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell sx={{ borderColor: 'divider' }}>
                      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: DOT_COLORS[material.color], flexShrink: 0 }} />
                        <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                          {material.name}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem', borderColor: 'divider', whiteSpace: 'nowrap' }}>
                      {material.basis}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.primary', borderColor: 'divider' }}>{material.quantityLabel}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>{material.unit}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', borderColor: 'divider', whiteSpace: 'nowrap' }}>
                      {formatPeso(material.unitCost)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.primary', borderColor: 'divider', whiteSpace: 'nowrap' }}>
                      {formatPeso(material.totalCost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </>
      )}

      <Divider />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, p: { xs: 2.5, md: 3 } }}
      >
        <FactorsAppliedBanner factors={factors} />

        <Button
          onClick={onContinue}
          variant="contained"
          disableElevation
          endIcon={<ArrowForwardRoundedIcon />}
          sx={{
            bgcolor: colors.accentBlue,
            '&:hover': { bgcolor: colors.accentBlueDark },
            flexShrink: 0,
            alignSelf: { xs: 'center', sm: 'auto' },
            fontSize: { xs: '0.9rem', sm: '1.05rem' },
          }}
        >
          Continue to Store Locator
        </Button>
      </Stack>
    </Paper>
  );
}

export default QuantityTakeoffTable;

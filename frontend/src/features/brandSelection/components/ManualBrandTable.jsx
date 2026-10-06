import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { BRAND_MATERIAL_SHORT_LABELS, getStoreBrandOptions, getSupplierOptions, getStoreName } from '../data/brandOptionsCache';
import { EXCLUDED } from '../utils/computeBom';
import { PRICED_MATERIALS } from '../../projects/data/parsedProjectCache';
import { groupMaterialsByCategory } from '../../../data/materialCategories';
import { formatPeso } from '../../../utils/formatNumbers';
import { colors } from '../../../theme/palette';

// Fixed widths and tableLayout: 'fixed' below keep the table from changing
// width when a longer or shorter brand name is picked.
const COLUMNS = [
  { label: 'MATERIAL', width: '13%' },
  { label: 'SUPPLIER', width: '24%' },
  { label: 'SELECTED BRAND', width: '29%' },
  { label: 'UNIT PRICE', width: '14%' },
  { label: 'ESTIMATED COST', width: '20%' },
];

// Sand and gravel have no brand, so they are not in BRAND_MATERIAL_SHORT_LABELS.
const ROW_LABELS = { ...BRAND_MATERIAL_SHORT_LABELS, sand: 'Sand', gravel: 'Gravel' };

// Truncates instead of wrapping, keeps every row the same height.
const TRUNCATE_SX = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

/**
 * What one row shows: its supplier (the selected store unless changed), that
 * store's options for the material, and the chosen one. `selected` is null
 * when the store does not sell it.
 */
function rowState(materialKey, storeId, choices, suppliers) {
  const supplier = suppliers[materialKey] ?? storeId;
  if (supplier === EXCLUDED) return { supplier, excluded: true, options: [], selected: null };
  const options = getStoreBrandOptions(supplier, materialKey);
  const selected = options.find((option) => option.id === choices[materialKey]) ?? options[0] ?? null;
  return { supplier, excluded: false, options, selected };
}

/** The selected store first, then every other store that sells it (cheapest first), then "leave it out". */
function SupplierSelect({ materialKey, storeId, value, onChange, small = false }) {
  const others = getSupplierOptions(materialKey).filter((store) => store.id !== storeId);
  const mainHasIt = getStoreBrandOptions(storeId, materialKey).length > 0;
  const label = value === EXCLUDED ? "Don't include in BOM" : getStoreName(value) ?? '';
  return (
    <TextField
      select
      size="small"
      fullWidth
      value={value}
      onChange={(event) => onChange(materialKey, event.target.value)}
      sx={small ? { '& .MuiSelect-select': { py: 0.75, fontSize: '0.8rem' } } : undefined}
      slotProps={{
        htmlInput: { 'aria-label': `Supplier for ${ROW_LABELS[materialKey] ?? materialKey}` },
        select: {
          MenuProps: { disableScrollLock: true },
          renderValue: () => (
            <Tooltip title={label}>
              <Box component="span" sx={{ display: 'block', ...TRUNCATE_SX, fontStyle: value === EXCLUDED ? 'italic' : 'normal' }}>
                {label}
              </Box>
            </Tooltip>
          ),
        },
      }}
    >
      <MenuItem value={storeId}>
        {getStoreName(storeId)} (selected store){mainHasIt ? '' : ' · not sold here'}
      </MenuItem>
      {others.length > 0 && <ListSubheader sx={{ lineHeight: '28px' }}>Other stores</ListSubheader>}
      {others.map((store) => (
        <MenuItem key={store.id} value={store.id}>
          {store.name} · from {formatPeso(store.price)}
        </MenuItem>
      ))}
      <Divider />
      <MenuItem value={EXCLUDED} sx={{ fontStyle: 'italic' }}>
        Don&apos;t include in BOM
      </MenuItem>
    </TextField>
  );
}

/** The brand cell: a dropdown, a fixed "Local (bulk)" for sand and gravel, or why there is nothing to pick. */
function BrandCell({ materialKey, row, onChoiceChange, small = false }) {
  if (row.excluded) {
    return <Typography sx={{ fontStyle: 'italic', color: 'text.secondary', fontSize: small ? '0.78rem' : '0.85rem' }}>Not in this BOM</Typography>;
  }
  if (!row.selected) {
    return (
      <Typography sx={{ color: colors.orangeDark, fontWeight: 600, fontSize: small ? '0.75rem' : '0.82rem' }}>
        Not sold at this store. Choose another supplier.
      </Typography>
    );
  }
  if (row.selected.isCommodity) {
    return <Typography sx={{ color: 'text.secondary', fontSize: small ? '0.78rem' : '0.88rem' }}>Local (bulk)</Typography>;
  }
  const selectedLabel = `${row.selected.brand} · ${row.selected.spec}`;
  return (
    <TextField
      select
      size="small"
      fullWidth
      value={row.selected.id}
      onChange={(event) => onChoiceChange(materialKey, event.target.value)}
      sx={small ? { '& .MuiSelect-select': { py: 0.75, fontSize: '0.8rem' } } : undefined}
      slotProps={{
        htmlInput: { 'aria-label': `Brand for ${ROW_LABELS[materialKey] ?? materialKey}` },
        select: {
          MenuProps: { disableScrollLock: true },
          renderValue: () => (
            <Tooltip title={selectedLabel}>
              <Box component="span" sx={{ display: 'block', ...TRUNCATE_SX }}>
                {selectedLabel}
              </Box>
            </Tooltip>
          ),
        },
      }}
    >
      {row.options.map((option) => (
        <MenuItem key={option.id} value={option.id} sx={small ? { fontSize: '0.8rem' } : undefined}>
          {option.brand} · {option.spec}
        </MenuItem>
      ))}
    </TextField>
  );
}

// MUI's TextField defaults to 1rem, much bigger than this page's 0.7-0.85rem
// scale, so everything here is sized down. Desktop's table is untouched.
function MaterialMobileCard({ materialKey, storeId, choices, suppliers, onChoiceChange, onSupplierChange, estimatedCost }) {
  const row = rowState(materialKey, storeId, choices, suppliers);
  return (
    <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 1.5 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.85rem' }}>{ROW_LABELS[materialKey] ?? materialKey}</Typography>
        <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.85rem' }}>{row.excluded ? '—' : formatPeso(estimatedCost)}</Typography>
      </Stack>
      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mb: 0.5 }}>Supplier</Typography>
      <SupplierSelect materialKey={materialKey} storeId={storeId} value={row.supplier} onChange={onSupplierChange} small />
      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 1, mb: 0.5 }}>Brand</Typography>
      <BrandCell materialKey={materialKey} row={row} onChoiceChange={onChoiceChange} small />
      {row.selected && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.85rem' }}>{formatPeso(row.selected.price)}</Typography>
        </>
      )}
    </Paper>
  );
}

/**
 * Manual mode: per material, the supplier (the selected store, another store
 * that sells it, or left out of the BOM, migration 038) and that store's brand,
 * with the live price. Fixed column widths and truncation keep the table from
 * resizing. On desktop/tablet (`sm`+) the "Estimated total" and "Continue to
 * Bill of Materials" sit in a footer inside this card (`flexShrink: 0`), below
 * the scrolling table, so they never scroll out of view. Mobile has its own
 * full-width card for this (see BrandSelectionPage).
 *
 * @param {object} props
 * @param {Record<string, number>} props.choices materialKey -> brand option id
 * @param {(materialKey: string, optionId: number) => void} props.onChoiceChange
 * @param {Record<string, number|'none'>} props.suppliers materialKey -> another store id, or 'none'
 * @param {(materialKey: string, value: number|'none') => void} props.onSupplierChange
 * @param {number} props.storeId The selected store (from Store Locator).
 * @param {Array<{key: string, amount: number}>} props.lineItems Pre-computed BOM line items for the Estimated Cost column.
 * @param {number} props.grandTotal Formatted via formatPeso for the footer's total.
 * @param {() => void} props.onContinue
 * @param {boolean} [props.isSaving]
 */
function ManualBrandTable({ choices, onChoiceChange, suppliers, onSupplierChange, storeId, lineItems, grandTotal, onContinue, isSaving = false }) {
  // Every material this project prices, including ones the selected store lacks.
  const materialKeys = PRICED_MATERIALS.map((material) => material.key);
  const categoryGroups = groupMaterialsByCategory(materialKeys.map((key) => ({ key })));
  const orderedKeys = categoryGroups.flatMap((group) => group.items.map((item) => item.key));
  const costOf = (materialKey) => lineItems?.find((item) => item.key === materialKey)?.amount ?? 0;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        bgcolor: 'common.white',
        boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
        // `overflow: hidden` clips to the rounded corners. The scrolling moved to
        // the inner Box below, so the sm+ footer sits outside the scroll region.
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
      }}
    >
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', px: { xs: 1.5, sm: 2.5 }, pt: { xs: 1.5, sm: 2 } }}>
        Each material comes from {getStoreName(storeId) ?? 'the selected store'} unless you pick another supplier. Choose
        &quot;Don&apos;t include in BOM&quot; for anything you will buy elsewhere or already have.
      </Typography>

      {/* The scrollable region (mobile accordions or desktop table). 'auto' scrolls
          instead of clipping rows when the list is taller than the card. */}
      <Box sx={{ overflow: 'auto', flex: 1, minHeight: { xs: 0, md: 320 } }}>
        <Stack spacing={1.25} sx={{ display: { xs: 'flex', md: 'none' }, p: { xs: 1.5, sm: 2.5 } }}>
          {categoryGroups.map((group) => (
            <Accordion
              key={group.label}
              // Every group starts closed on mobile; the user opens the one they want.
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
                  {group.items.map(({ key: materialKey }) => (
                    <MaterialMobileCard
                      key={materialKey}
                      materialKey={materialKey}
                      storeId={storeId}
                      choices={choices}
                      suppliers={suppliers}
                      onChoiceChange={onChoiceChange}
                      onSupplierChange={onSupplierChange}
                      estimatedCost={costOf(materialKey)}
                    />
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>

        <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
          <Table sx={{ minWidth: 760, tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableCell
                    key={col.label}
                    sx={{ width: col.width, color: 'text.secondary', fontSize: '0.72rem', fontWeight: 700, letterSpacing: 0.5, borderColor: 'divider' }}
                  >
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {orderedKeys.map((materialKey) => {
                const row = rowState(materialKey, storeId, choices, suppliers);
                return (
                  <TableRow key={materialKey} sx={{ '&:last-child td': { borderBottom: 0 }, bgcolor: row.excluded ? 'grey.50' : undefined }}>
                    <TableCell sx={{ ...TRUNCATE_SX, fontWeight: 700, color: 'text.primary', fontSize: '0.9rem', borderColor: 'divider' }}>
                      {ROW_LABELS[materialKey] ?? materialKey}
                    </TableCell>
                    <TableCell sx={{ borderColor: 'divider' }}>
                      <SupplierSelect materialKey={materialKey} storeId={storeId} value={row.supplier} onChange={onSupplierChange} />
                    </TableCell>
                    <TableCell sx={{ borderColor: 'divider' }}>
                      <BrandCell materialKey={materialKey} row={row} onChoiceChange={onChoiceChange} />
                    </TableCell>
                    <TableCell sx={{ ...TRUNCATE_SX, color: 'text.primary', fontWeight: 700, borderColor: 'divider' }}>
                      {row.selected ? formatPeso(row.selected.price) : '—'}
                    </TableCell>
                    <TableCell sx={{ ...TRUNCATE_SX, color: 'text.primary', fontWeight: 700, borderColor: 'divider' }}>
                      {row.excluded || !row.selected ? '—' : formatPeso(costOf(materialKey))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Box>

      {/* Desktop/tablet only: pinned to the bottom of this card, outside the
          scrollable Box above. Mobile has its own card (see BrandSelectionPage). */}
      <Stack
        direction="row"
        spacing={2}
        sx={{
          display: { xs: 'none', sm: 'flex' },
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          bgcolor: 'common.white',
          borderTop: '1px solid',
          borderColor: 'divider',
          p: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: '0.78rem', color: colors.iconBlueFg, fontWeight: 600 }}>Estimated total</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: 'text.primary' }}>{formatPeso(grandTotal)}</Typography>
        </Box>

        <Button
          onClick={onContinue}
          variant="contained"
          disableElevation
          disabled={isSaving}
          endIcon={<ArrowForwardRoundedIcon />}
          sx={{ bgcolor: colors.accentBlue, '&:hover': { bgcolor: colors.accentBlueDark }, flexShrink: 0, fontSize: '1.05rem' }}
        >
          Continue to Bill of Materials
        </Button>
      </Stack>
    </Paper>
  );
}

export default ManualBrandTable;

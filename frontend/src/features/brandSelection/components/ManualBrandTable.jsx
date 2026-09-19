import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
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
import { BRAND_MATERIAL_SHORT_LABELS, getStoreBrandOptions, getAvailableMaterialKeys } from '../data/brandOptionsMock';
import { groupMaterialsByCategory } from '../../../data/materialCategories';
import { formatPeso } from '../../../utils/formatNumbers';
import { colors } from '../../../theme/palette';

// Fixed widths + tableLayout: 'fixed' below stop the table (and page)
// from shifting width when a longer/shorter brand name gets picked.
const COLUMNS = [
  { label: 'MATERIAL', width: '16%' },
  { label: 'SELECTED BRAND', width: '32%' },
  { label: 'UNIT PRICE', width: '14%' },
  { label: 'SUPPLIER', width: '18%' },
  { label: 'ESTIMATED COST', width: '20%' },
];

// Truncates instead of wrapping, keeps every row the same height.
const TRUNCATE_SX = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

// MUI's TextField defaults to 1rem font, way bigger than the rest of this
// page's 0.7-0.85rem scale, so everything here is sized down to match.
// Desktop's table below is untouched.
function MaterialMobileCard({ materialKey, storeId, choices, onChoiceChange, estimatedCost }) {
  const options = getStoreBrandOptions(storeId, materialKey);
  const selectedOption = options.find((option) => option.id === choices[materialKey]) ?? options[0];
  const selectedLabel = `${selectedOption.brand} · ${selectedOption.spec}`;

  return (
    <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 1.5 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.85rem' }}>
          {BRAND_MATERIAL_SHORT_LABELS[materialKey]}
        </Typography>
        <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.85rem' }}>{formatPeso(estimatedCost)}</Typography>
      </Stack>

      <TextField
        select
        size="small"
        fullWidth
        value={selectedOption.id}
        onChange={(event) => onChoiceChange(materialKey, event.target.value)}
        sx={{
          fontSize: '0.8rem',
          '& .MuiSelect-select': { py: 0.75, fontSize: '0.8rem' },
        }}
        slotProps={{
          select: {
            MenuProps: { disableScrollLock: true },
            renderValue: () => (
              <Box component="span" sx={{ display: 'block', ...TRUNCATE_SX }}>
                {selectedLabel}
              </Box>
            ),
          },
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.id} value={option.id} sx={{ fontSize: '0.8rem' }}>
            {option.brand} · {option.spec}
          </MenuItem>
        ))}
      </TextField>

      <Divider sx={{ my: 1 }} />

      <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.85rem' }}>
        {formatPeso(selectedOption.price)}
      </Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem', mt: 0.5, ...TRUNCATE_SX }}>
        {selectedOption.supplier}
      </Typography>
    </Paper>
  );
}

/**
 * Manual mode: per-material brand dropdown, live price/supplier for
 * whatever's picked. Fixed column widths + truncation so picking a
 * different option never resizes the table.
 *
 * Desktop/tablet (`sm`+) only: the "Estimated total" + "Continue to Bill of
 * Materials" action lives inside this same card now, as a footer that
 * doesn't scroll with the table — the table/list above it is its own
 * `overflow: auto` region (`flex: 1`), while this footer sits below it with
 * `flexShrink: 0`, so scrolling the list can never carry the total/button
 * out of view. Mobile keeps its own separate full-width card for this
 * below this one instead (see BrandSelectionPage) — unchanged by this.
 *
 * @param {object} props
 * @param {Record<string, string>} props.choices materialKey -> brandOptionId
 * @param {(materialKey: string, optionId: string) => void} props.onChoiceChange
 * @param {string} props.storeId Which store's catalog to use.
 * @param {Array<{key: string, amount: number}>} props.lineItems Pre-computed BOM line items for the Estimated Cost column.
 * @param {number} props.grandTotal Formatted via formatPeso for the footer's total.
 * @param {() => void} props.onContinue
 * @param {boolean} [props.isSaving]
 */
function ManualBrandTable({ choices, onChoiceChange, storeId, lineItems, grandTotal, onContinue, isSaving = false }) {
  // Only materials this project actually needs, not the full static list
  // (which still has roofing even if the project toggled it off).
  const availableMaterialKeys = getAvailableMaterialKeys(storeId);
  const categoryGroups = groupMaterialsByCategory(availableMaterialKeys.map((key) => ({ key })));

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        bgcolor: 'common.white',
        boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
        // `overflow: hidden` here (clipping to the rounded corners) instead
        // of the scrolling itself — that moved to the inner Box below, so
        // the sm+ footer can sit outside the scrollable region without
        // itself scrolling away.
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* The actual scrollable region: mobile's accordion list or desktop's
          table, whichever this breakpoint shows. 'auto' scrolls instead of
          clipping rows off the bottom when the list is taller than the
          card (same fix as QuantityTakeoffTable.jsx) — `minHeight` keeps a
          reasonable minimum on desktop even when the list is short. */}
      <Box sx={{ overflow: 'auto', flex: 1, minHeight: { xs: 0, md: 320 } }}>
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
                  {group.items.map(({ key: materialKey }) => (
                    <MaterialMobileCard
                      key={materialKey}
                      materialKey={materialKey}
                      storeId={storeId}
                      choices={choices}
                      onChoiceChange={onChoiceChange}
                      estimatedCost={lineItems?.find((item) => item.key === materialKey)?.amount ?? 0}
                    />
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>

        <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
          <Table sx={{ minWidth: 680, tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableCell
                    key={col.label}
                    sx={{
                      width: col.width,
                      color: 'text.secondary',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      borderColor: 'divider',
                    }}
                  >
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {availableMaterialKeys.map((materialKey) => {
                const options = getStoreBrandOptions(storeId, materialKey);
                const selectedOption = options.find((option) => option.id === choices[materialKey]) ?? options[0];
                const selectedLabel = `${selectedOption.brand} · ${selectedOption.spec}`;
                const estimatedCost = lineItems?.find((item) => item.key === materialKey)?.amount ?? 0;

                return (
                  <TableRow key={materialKey} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell sx={{ ...TRUNCATE_SX, fontWeight: 700, color: 'text.primary', fontSize: '0.9rem', borderColor: 'divider' }}>
                      {BRAND_MATERIAL_SHORT_LABELS[materialKey]}
                    </TableCell>
                    <TableCell sx={{ borderColor: 'divider' }}>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={selectedOption.id}
                        onChange={(event) => onChoiceChange(materialKey, event.target.value)}
                        slotProps={{
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
                        {options.map((option) => (
                          <MenuItem key={option.id} value={option.id}>
                            {option.brand} · {option.spec}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell sx={{ ...TRUNCATE_SX, color: 'text.primary', fontWeight: 700, borderColor: 'divider' }}>
                      {formatPeso(selectedOption.price)}
                    </TableCell>
                    <TableCell sx={{ borderColor: 'divider' }}>
                      <Tooltip title={selectedOption.supplier}>
                        <Box component="span" sx={{ display: 'block', ...TRUNCATE_SX, color: 'text.secondary' }}>
                          {selectedOption.supplier}
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ ...TRUNCATE_SX, color: 'text.primary', fontWeight: 700, borderColor: 'divider' }}>
                      {formatPeso(estimatedCost)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Box>

      {/* Desktop/tablet only: pinned to the bottom of this card, outside the
          scrollable Box above, so it never scrolls out of view. Mobile
          keeps its own separate full-width card below this one instead
          (see BrandSelectionPage) — unaffected by this. */}
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
  );
}

export default ManualBrandTable;

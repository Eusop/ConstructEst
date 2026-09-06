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
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { BRAND_MATERIAL_SHORT_LABELS, getStoreBrandOptions, getAvailableMaterialKeys } from '../data/brandOptionsMock';
import { groupMaterialsByCategory } from '../../../data/materialCategories';
import { colors } from '../../../theme/palette';

// Fixed percentage widths (sum to 100%) paired with `tableLayout: 'fixed'`
// on the Table below — this is what actually stops the table (and the card/
// page around it) from shifting width when a longer or shorter brand name
// is selected. Without an explicit layout, the browser's default table
// auto-sizing recomputes every column's width from its content on each
// render, which is what caused the whole page to visibly shift.
const COLUMNS = [
  { label: 'MATERIAL', width: '15%' },
  { label: 'SELECTED BRAND', width: '27%' },
  { label: 'UNIT PRICE', width: '12%' },
  { label: 'RATING', width: '13%' },
  { label: 'SUPPLIER', width: '16%' },
  { label: 'ESTIMATED COST', width: '17%' },
];

// Shared truncation styling for any cell whose text length varies with the
// selected option — keeps every row the same height instead of wrapping to
// a second line.
const TRUNCATE_SX = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

function formatPeso(value) {
  return `₱${Math.round(value).toLocaleString('en-PH')}`;
}

function QualityStars({ quality }) {
  return (
    <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
      {Array.from({ length: 5 }, (_, index) => (
        <StarRoundedIcon key={index} sx={{ fontSize: 16, color: index < quality ? colors.orange : 'grey.300' }} />
      ))}
    </Stack>
  );
}

// Was noticeably larger and roomier than every other piece of text on the
// page — MUI's TextField falls back to a 1rem input font and default
// padding when nothing overrides it, which stood out sharply next to the
// 0.7–0.85rem scale the rest of Brand Selection (and the Automatic page in
// particular) is built on. This card's whole scale below is pulled down to
// match that same range, and the select itself gets an explicit smaller
// font/tighter padding so its dropdown value stops reading like a page
// heading. Desktop's table (further down, unaffected by this component)
// keeps the exact TextField sizing it already had.
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

      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.85rem' }}>
          {formatPeso(selectedOption.price)}
        </Typography>
        <QualityStars quality={selectedOption.quality} />
      </Stack>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem', mt: 0.5, ...TRUNCATE_SX }}>
        {selectedOption.supplier}
      </Typography>
    </Paper>
  );
}

/**
 * Manual mode body: per-material brand dropdown, live-updating price/
 * quality/supplier for whichever option is picked. Column widths are fixed
 * (see COLUMNS) and long text is truncated with a tooltip rather than
 * wrapped, so picking a different option never changes the table's size or
 * shifts the row heights.
 *
 * @param {object} props
 * @param {Record<string, string>} props.choices materialKey -> brandOptionId
 * @param {(materialKey: string, optionId: string) => void} props.onChoiceChange
 * @param {string} props.storeId Which store's brand catalog to populate the dropdowns from.
 * @param {Array<{key: string, amount: number}>} props.lineItems Pre-computed
 *   BOM line items (from computeBom) — supplies each row's Estimated Cost so
 *   it always matches what Bill of Materials will show for the same choice.
 */
function ManualBrandTable({ choices, onChoiceChange, storeId, lineItems }) {
  // Only materials this project's estimation actually needs (and this
  // store's catalog has options for) — not the app-wide static list, which
  // still includes e.g. roofing even for a project that's toggled it off.
  const availableMaterialKeys = getAvailableMaterialKeys(storeId);
  const categoryGroups = groupMaterialsByCategory(availableMaterialKeys.map((key) => ({ key })));

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        bgcolor: 'common.white',
        boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
        // 'auto' rather than 'hidden' — still clips to the rounded corners,
        // but scrolls internally when the material list is taller than the
        // card's flex-computed height, instead of silently clipping rows
        // off the bottom (see the identical fix in QuantityTakeoffTable.jsx
        // for the full explanation — same Paper shape, same risk).
        overflow: 'auto',
        flex: 1,
        minWidth: 0,
        minHeight: { xs: 0, md: 320 },
      }}
    >
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
        <Table sx={{ minWidth: 780, tableLayout: 'fixed' }}>
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
                    <QualityStars quality={selectedOption.quality} />
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
    </Paper>
  );
}

export default ManualBrandTable;

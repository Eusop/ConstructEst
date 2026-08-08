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
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { BRAND_MATERIAL_SHORT_LABELS, getStoreBrandOptions } from '../data/brandOptionsMock';
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
        minHeight: 320,
      }}
    >
      <Box sx={{ overflowX: 'auto' }}>
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
            {Object.keys(BRAND_MATERIAL_SHORT_LABELS).map((materialKey) => {
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

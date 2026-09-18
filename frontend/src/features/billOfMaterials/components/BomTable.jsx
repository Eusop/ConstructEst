import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { groupMaterialsByCategory } from '../../../data/materialCategories';
import { formatAmount } from '../../../utils/formatNumbers';

const COLUMNS = ['MATERIAL', 'BRAND', 'SPEC', 'QTY', 'UNIT P', 'AMOUNT'];

function BomMobileCard({ item }) {
  return (
    <Paper
      elevation={0}
      sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 1.75 }}
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.92rem' }}>{item.material}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{item.brand}</Typography>
          {item.spec && (
            <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem', mt: 0.15 }}>{item.spec}</Typography>
          )}
        </Box>
        {item.available === false ? (
          <Typography sx={{ fontWeight: 700, color: 'text.secondary', fontStyle: 'italic', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
            Not available here
          </Typography>
        ) : (
          <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
            ₱{formatAmount(item.amount)}
          </Typography>
        )}
      </Stack>

      <Divider sx={{ my: 1.25 }} />

      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Qty</Typography>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.primary' }}>{item.quantityLabel}</Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Unit price</Typography>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.primary' }}>
            {item.available === false ? 'Not available' : formatAmount(item.unitPrice)}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

/**
 * Final priced material list — material, brand actually sourced, quantity,
 * unit price, and line amount.
 *
 * Renders as a bare content section (no card chrome of its own) — it's
 * composed inside the Bill of Materials page's single parent card alongside
 * the subtotal and download-report sections, not used as a standalone card.
 *
 * Below `md`, swaps the table for one card per line item instead of
 * horizontally scrolling a shrunk desktop table — see BomMobileCard above.
 *
 * @param {object} props
 * @param {Array<{key: string, material: string, brand: string, spec: string|null, available: boolean, quantityLabel: string, unitPrice: number|null, amount: number|null}>} props.items
 */
function BomTable({ items }) {
  const categoryGroups = groupMaterialsByCategory(items);

  return (
    <>
      {/* Below `md`: the same 14-16 line items as the desktop table, but
          grouped into the same Structural/Roofing/Formwork & Scaffolding
          accordions used elsewhere in this flow (Manual Brand Selection,
          Quantity Take-off) instead of one long flat stack of cards — the
          single biggest contributor to this page's mobile length. */}
      <Stack spacing={1.25} sx={{ display: { xs: 'flex', md: 'none' } }}>
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
                {group.items.map((item) => (
                  <BomMobileCard key={item.key} item={item} />
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>

      <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
        <Table sx={{ minWidth: 480 }}>
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
            {items.map((item) => (
              <TableRow key={item.key} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                <TableCell sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.9rem', borderColor: 'divider' }}>
                  {item.material}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>{item.brand}</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.82rem', borderColor: 'divider' }}>{item.spec}</TableCell>
                <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>{item.quantityLabel}</TableCell>
                {item.available === false ? (
                  <TableCell sx={{ color: 'text.secondary', fontStyle: 'italic', borderColor: 'divider' }} colSpan={2}>
                    Not available at this store
                  </TableCell>
                ) : (
                  <>
                    <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>{formatAmount(item.unitPrice)}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.primary', borderColor: 'divider' }}>
                      ₱{formatAmount(item.amount)}
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </>
  );
}

export default BomTable;

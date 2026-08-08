import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Box from '@mui/material/Box';

const COLUMNS = ['MATERIAL', 'BRAND', 'QTY', 'UNIT P', 'AMOUNT'];

function formatNumber(value) {
  return value.toLocaleString('en-PH', { maximumFractionDigits: 2 });
}

/**
 * Final priced material list — material, brand actually sourced, quantity,
 * unit price, and line amount. Scrolls horizontally on narrow viewports
 * instead of clipping.
 *
 * Renders as a bare content section (no card chrome of its own) — it's
 * composed inside the Bill of Materials page's single parent card alongside
 * the subtotal and download-report sections, not used as a standalone card.
 *
 * @param {object} props
 * @param {Array<{key: string, material: string, brand: string, quantityLabel: string, unitPrice: number, amount: number}>} props.items
 */
function BomTable({ items }) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
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
              <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>{item.quantityLabel}</TableCell>
              <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>{formatNumber(item.unitPrice)}</TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'text.primary', borderColor: 'divider' }}>
                ₱{formatNumber(item.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

export default BomTable;

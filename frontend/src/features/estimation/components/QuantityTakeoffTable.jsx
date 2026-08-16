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
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import FactorsAppliedBanner from './FactorsAppliedBanner';
import { colors } from '../../../theme/palette';
import { QUANTITY_TAKEOFF_MATERIALS } from '../data/quantityTakeoffMaterials';

const COLUMNS = ['MATERIAL', 'BASIS', 'QUANTITY', 'UNIT', 'UNIT COST', 'TOTAL COST'];

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
  const materials = buildMaterials(storeys);

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
        minHeight: 420,
      }}
    >
      <Box sx={{ overflowX: 'auto' }}>
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

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
import MemberSheets from './MemberSheets';
import { colors } from '../../../theme/palette';
import { QUANTITY_TAKEOFF_MATERIALS } from '../data/quantityTakeoffMaterials';
import { groupMaterialsByCategory } from '../../../data/materialCategories';

const COLUMNS = ['MATERIAL', 'BASIS', 'QUANTITY', 'UNIT'];

const DOT_COLORS = {
  blue: colors.iconBlueFg,
  orange: colors.iconOrangeFg,
  green: colors.iconGreenFg,
  teal: colors.iconTealFg,
  purple: colors.iconPurpleFg,
};

function StatCell({ label, value }) {
  return (
    <Box>
      <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.primary' }}>{value}</Typography>
    </Box>
  );
}

// Toggle link for the engine's step by step numbers of one material.
function ComputationToggle({ open, onToggle }) {
  return (
    <Button
      size="small"
      onClick={onToggle}
      endIcon={<ExpandMoreRoundedIcon sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
      sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600, color: colors.accentBlue, px: 0.5, minWidth: 0 }}
    >
      {open ? 'Hide computation' : 'Show computation'}
    </Button>
  );
}

// Lists the steps saved by the engine. Old estimations have none, so the
// user is told to recalculate.
function ComputationSteps({ steps }) {
  if (!steps || steps.length === 0) {
    return (
      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
        No computation saved for this estimation. Click Recalculate to see the steps.
      </Typography>
    );
  }
  return (
    <Box component="ol" sx={{ m: 0, pl: 2.5, bgcolor: 'grey.50', borderRadius: 2, py: 1, pr: 1.5 }}>
      {steps.map((step, index) => (
        <Typography component="li" key={index} sx={{ fontSize: '0.78rem', color: 'text.primary', fontFamily: 'monospace', py: 0.25, wordBreak: 'break-word' }}>
          {step}
        </Typography>
      ))}
    </Box>
  );
}

function MaterialTableRow({ material }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow sx={{ '& td': { borderBottom: open ? 0 : undefined } }}>
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
          <Box>
            <ComputationToggle open={open} onToggle={() => setOpen((value) => !value)} />
          </Box>
        </TableCell>
        <TableCell sx={{ fontWeight: 700, color: 'text.primary', borderColor: 'divider' }}>
          {material.quantityLabel}
          {material.piecesLabel && (
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 400, color: 'text.secondary', whiteSpace: 'nowrap' }}>{material.piecesLabel}</Typography>
          )}
        </TableCell>
        <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>{material.unit}</TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={COLUMNS.length} sx={{ borderColor: 'divider', pt: 0 }}>
            <ComputationSteps steps={material.steps} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function MaterialMobileCard({ material, showComputation = false }) {
  const [open, setOpen] = useState(false);
  return (
    <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 1.75 }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: DOT_COLORS[material.color], flexShrink: 0 }} />
        <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.92rem' }}>{material.name}</Typography>
      </Stack>

      <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem', mt: 0.5, mb: 1.25 }}>{material.basis}</Typography>

      <Divider sx={{ mb: 1.25 }} />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
        <StatCell label="Quantity" value={material.piecesLabel ? `${material.quantityLabel} (${material.piecesLabel})` : material.quantityLabel} />
        <StatCell label="Unit" value={material.unit} />
      </Box>

      {showComputation && (
        <Box sx={{ mt: 1 }}>
          <ComputationToggle open={open} onToggle={() => setOpen((value) => !value)} />
          {open && <ComputationSteps steps={material.steps} />}
        </Box>
      )}
    </Paper>
  );
}

// CHB is the one row whose basis text names the storeys count. Every other
// basis is a fixed description of how the engine derives the quantity.
function buildMaterials(storeys) {
  return QUANTITY_TAKEOFF_MATERIALS.map((material) => ({
    ...material,
    basis: material.key === 'hollowBlocks' ? `Wall area (${storeys} flr) ÷ coverage` : material.basis,
  }));
}

/**
 * Itemized material quantity take-off table, from the parsed floor plan
 * measurements and calibration factors (see QUANTITY_TAKEOFF_MATERIALS). No
 * prices here, since no store or brand is chosen yet; costs appear from Store
 * Locator on. Scrolls horizontally on narrow viewports instead of clipping.
 *
 * @param {object} props
 * @param {number} props.storeys Used to label the CHB basis (e.g. "(2 flr)").
 * @param {{cement: number, steel: number, roofing: number, wastage: number}} props.factors
 * @param {Array<object>|null} [props.members] The engine's "By member" breakdown (see MemberSheets).
 * @param {() => void} props.onContinue Called when "Continue to Store Locator" is clicked.
 */
function QuantityTakeoffTable({ storeys, factors, members = null, onContinue }) {
  const [viewMode, setViewMode] = useState('total');
  const materials = buildMaterials(storeys);
  const categoryGroups = groupMaterialsByCategory(materials);

  return (
    // The extra wrapping Box is the fix: this card is Stack's last child, and
    // Stack resets margin to 0 on its direct children, so a margin-bottom on
    // the Paper is overridden. Padding on this outer Box is not, so it keeps a
    // gap below the card (matching the page's spacing={2.5}) once the natural-height
    // card overflows the scroll region.
    <Box sx={{ pb: 2.5 }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: 'common.white',
          boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
          minWidth: 0,
          // No flex:1/minHeight/overflow clamp: the card sizes to its content
          // (including when an accordion opens), and the page-level
          // scroll region (DashboardLayout's Outlet wrapper) handles anything taller.
          display: 'flex',
          flexDirection: 'column',
        }}
      >
      {/* Total (what to buy, with the factors) or By member (worked out like
          the engineer's manual sheets). "By source" was removed 2026-10-09:
          its "Shared" group confused the engineer and By member shows the
          per-floor numbers. */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', p: { xs: 1.5, sm: 2.5 }, pb: { xs: 0.5, sm: 1 }, flexShrink: 0 }}
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
              whiteSpace: 'nowrap',
              '&.Mui-selected': { bgcolor: 'common.white', color: colors.accentBlue, boxShadow: '0 1px 4px rgba(20, 30, 60, 0.12)', '&:hover': { bgcolor: 'common.white' } },
            },
          }}
        >
          <ToggleButton value="total" disableRipple>Total</ToggleButton>
          <ToggleButton value="byMember" disableRipple>By member</ToggleButton>
        </ToggleButtonGroup>
        {viewMode === 'byMember' && (
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
            Worked out per member: raw quantities, each rounded up per member. The Total view adds the
            cement, steel and roofing factors and wastage and rounds once, so its totals are a little higher.
          </Typography>
        )}
      </Stack>

      <Box>
      {viewMode === 'byMember' ? (
        <MemberSheets members={members} />
      ) : (
        <>
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
                    {group.items.map((material) => (
                      <MaterialMobileCard key={material.key} material={material} showComputation />
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>

          <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto', p: { xs: 1.5, sm: 2.5 } }}>
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
                  <MaterialTableRow key={material.key} material={material} />
                ))}
              </TableBody>
            </Table>
          </Box>
        </>
      )}
      </Box>

      <Divider sx={{ flexShrink: 0 }} />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, p: { xs: 2.5, md: 3 }, flexShrink: 0 }}
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
    </Box>
  );
}

export default QuantityTakeoffTable;

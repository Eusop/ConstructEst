import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { colors } from '../../../theme/palette';

// e.g. 2.406 cu.m, 1,500 pcs
function formatResult(result) {
  const value = Number(result.quantity);
  const text = Number.isInteger(value)
    ? value.toLocaleString('en-PH')
    : value.toLocaleString('en-PH', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  return `${text} ${result.unit}`;
}

// One block of working lines (Given, Concrete, Rebar, Formworks, ...).
function SheetBlock({ title, lines }) {
  return (
    <Box>
      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary', mb: 0.5 }}>{title}:</Typography>
      <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, px: 1.5, py: 1 }}>
        {lines.map((line, index) => (
          <Typography key={index} sx={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'text.primary', py: 0.2, wordBreak: 'break-word' }}>
            {line}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

// One member: its quantities, then its working behind Show / Hide computation
// (same toggle as the Total view). Hidden at first so only the quantities show.
function MemberBody({ member }) {
  const [open, setOpen] = useState(false);
  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary', mb: 0.75 }}>Quantities for this member:</Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
          {member.results.map((result) => (
            <Box key={result.material} sx={{ bgcolor: colors.iconBlueBg, borderRadius: 999, px: 1.25, py: 0.4 }}>
              <Typography sx={{ fontSize: '0.78rem', color: 'text.primary' }}>
                <strong>{result.material}</strong> {formatResult(result)}
              </Typography>
            </Box>
          ))}
        </Stack>
        {member.note && <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.75 }}>{member.note}</Typography>}
        <Button
          size="small"
          onClick={() => setOpen((value) => !value)}
          endIcon={<ExpandMoreRoundedIcon sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
          sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600, color: colors.accentBlue, px: 0.5, minWidth: 0, mt: 0.75 }}
        >
          {open ? 'Hide computation' : 'Show computation'}
        </Button>
      </Box>
      <Collapse in={open} unmountOnExit>
        <Stack spacing={1.5}>
          <SheetBlock title="Given" lines={member.given} />
          {member.sections.map((section) => (
            <SheetBlock key={section.title} title={section.title} lines={section.lines} />
          ))}
        </Stack>
      </Collapse>
    </Stack>
  );
}

/**
 * "By member" view: each structural member worked out like the engineer's
 * manual estimate sheets (Footing, Column, Beam, ...), from the engine's
 * memberBreakdown (formulas.py + member_sheets.py, migration 043). Raw values,
 * rounded up per member; the Total view keeps the factors and wastage.
 *
 * @param {object} props
 * @param {Array<{key: string, title: string, given: string[], sections: {title: string, lines: string[]}[], results: {material: string, quantity: number, unit: string}[], note?: string}>|null} props.members
 */
function MemberSheets({ members }) {
  if (!members || members.length === 0) {
    return (
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', p: { xs: 1.5, sm: 2.5 } }}>
        This estimate was saved before the By member view existed. Click Recalculate to see it.
      </Typography>
    );
  }
  return (
    <Stack spacing={1.25} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      {/* Cards stay open so every member's quantities show at once. */}
      {members.map((member) => (
        <Box key={member.key} data-member={member.key} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: '12px', px: 2, pt: 1.5, pb: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'text.primary', mb: 1 }}>{member.title}</Typography>
          <MemberBody member={member} />
        </Box>
      ))}
    </Stack>
  );
}

export default MemberSheets;

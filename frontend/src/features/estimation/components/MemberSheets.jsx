import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
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
      {members.map((member, index) => (
        <Accordion
          key={member.key}
          defaultExpanded={index === 0}
          disableGutters
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: '12px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}
        >
          <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'text.primary' }}>{member.title}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Stack spacing={1.5}>
              <SheetBlock title="Given" lines={member.given} />
              {member.sections.map((section) => (
                <SheetBlock key={section.title} title={section.title} lines={section.lines} />
              ))}
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
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  );
}

export default MemberSheets;

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useIsMobile } from '../../../hooks/useIsMobile';

// Keep in sync with LAYER_ALIASES in backend/engine/dxf_reader.py. This is
// static text, so a layer the engine starts or stops reading must be updated
// here too. The notation is Engr. Espiritu's (Reply 4): show the layer names
// so users rename their CAD layers before uploading.
const LAYER_GROUPS = [
  { label: 'Required', names: ['WALL', 'DOOR', 'WINDOW', 'COLUMN (or COL)', 'STAIR', 'ROOF', 'FLOOR'] },
  { label: 'Optional', note: 'improves the estimate', names: ['BEAM', 'CANTBEAM', 'TRUSS'] },
  // FTG / FTBEAM (also Reply 4) aren't listed: the engine doesn't read them.
];

/**
 * "Name your CAD layers like this" guide above the DXF upload. Open by default
 * on desktop, collapsed on phones so it doesn't push the dropzone down.
 */
function LayerNamesGuide() {
  const isMobile = useIsMobile();

  return (
    <Accordion
      defaultExpanded={!isMobile}
      disableGutters
      elevation={0}
      sx={{
        mb: 1.5,
        border: '1px solid',
        borderColor: 'grey.200',
        borderRadius: '12px !important',
        '&:before': { display: 'none' },
        overflow: 'hidden',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { my: 1 } }}>
        <Typography sx={{ fontWeight: 600, fontSize: { xs: '0.82rem', sm: '0.88rem' }, color: 'text.primary' }}>
          Name your CAD layers like this
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '150px 1fr' }, rowGap: { xs: 0.5, sm: 1 }, columnGap: 2 }}>
          {LAYER_GROUPS.map((group) => (
            <Box key={group.label} sx={{ display: 'contents' }}>
              <Box sx={{ mt: { xs: 1, sm: 0 } }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'text.primary' }}>{group.label}</Typography>
                {group.note && (
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{group.note}</Typography>
                )}
              </Box>
              <Typography sx={{ fontSize: '0.8rem', color: 'text.primary', fontFamily: 'monospace' }}>
                {group.names.join(' · ')}
              </Typography>
            </Box>
          ))}
        </Box>
        <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.72rem', sm: '0.78rem' }, mt: 1.5 }}>
          Prefixes and suffixes are fine (A-WALL, WALL-150). Rename your layers before uploading. Draw beams and
          trusses as centerlines, not as two edge lines.
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
}

export default LayerNamesGuide;

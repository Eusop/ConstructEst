import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import { getEngineDefaults, getEngineDefaultsBothVariants } from '../data/engineDefaultParameters';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { colors } from '../../../theme/palette';

// Every field mirrors an `overrides.get("<key>", default)` call in
// engine/formulas.py — leaving a field blank sends `null`, which the
// backend drops before handing overrides to the engine, so it falls back
// to that same built-in default. Nothing here is required.
const GROUPS = [
  {
    key: 'columnsAndBeams',
    label: 'Columns & Beams',
    fields: [
      { key: 'columnWidth', label: 'Column width', unit: 'm', step: 0.01 },
      { key: 'columnDepth', label: 'Column depth', unit: 'm', step: 0.01 },
      { key: 'columnHeight', label: 'Column height', unit: 'm', step: 0.1 },
      { key: 'columnCount', label: 'Column count', unit: 'pcs', step: 1 },
      { key: 'beamWidth', label: 'Beam width', unit: 'm', step: 0.01 },
      { key: 'beamDepth', label: 'Beam depth', unit: 'm', step: 0.01 },
      { key: 'beamLength', label: 'Beam total length', unit: 'm', step: 0.5 },
    ],
  },
  {
    key: 'footings',
    label: 'Footings',
    fields: [
      { key: 'footingWidth', label: 'Footing width', unit: 'm', step: 0.01 },
      { key: 'footingLength', label: 'Footing length', unit: 'm', step: 0.01 },
      { key: 'footingDepth', label: 'Footing depth', unit: 'm', step: 0.1 },
    ],
  },
  {
    key: 'floorAndStairs',
    label: 'Floor & Stairs',
    fields: [
      { key: 'floorToFloorHeight', label: 'Floor-to-floor height', unit: 'm', step: 0.1 },
      { key: 'stairWidth', label: 'Stair width', unit: 'm', step: 0.05 },
      { key: 'riserHeight', label: 'Riser height', unit: 'm', step: 0.01 },
      { key: 'treadDepth', label: 'Tread depth', unit: 'm', step: 0.01 },
      { key: 'waistThickness', label: 'Waist thickness', unit: 'm', step: 0.01 },
      { key: 'stairRebarSpacing', label: 'Stair rebar spacing', unit: 'm', step: 0.01 },
    ],
  },
  {
    key: 'scaffolding',
    label: 'Scaffolding',
    fields: [
      { key: 'buildingHeight', label: 'Building height', unit: 'm', step: 0.1 },
      { key: 'scaffoldingSetWidth', label: 'Scaffold set width', unit: 'm', step: 0.01 },
      { key: 'scaffoldingSetHeight', label: 'Scaffold set height', unit: 'm', step: 0.01 },
      { key: 'scaffoldingSetCount', label: 'Scaffold set count (overrides the above)', unit: 'sets', step: 1 },
    ],
  },
];

// columnCount (comes from the DXF's own detected count) and beamLength
// (derived from wall run length) have no fixed number to show — every
// other field's placeholder is the real value the engine will fall back
// to, computed for `storeys` when known (a project), or shown as both
// the 1-storey/2-storey variants when it isn't (the admin's global page).
//
// `effectiveDefaults`, when given, takes priority over the hardcoded
// literals below — it's the project's real effective fallback chain
// (project override -> admin's global default -> engine's own hardcoded
// default), fetched live from the backend. Without it, this placeholder
// used to always show formulas.py's hardcoded literal even when an admin
// had configured a different global default, so leaving a field blank
// looked like it would use one number but silently used another. Only a
// project page can pass this (the admin global page IS the thing setting
// that global default, so its own placeholder correctly stays the
// hardcoded engine fallback — there's no more-global level above it).
function fieldPlaceholder(fieldKey, storeys, effectiveDefaults) {
  if (effectiveDefaults) {
    const value = effectiveDefaults[fieldKey];
    if (value != null) return String(value);
  }
  if (storeys != null) {
    const value = getEngineDefaults(storeys)[fieldKey];
    return value != null ? String(value) : 'Auto';
  }
  const { oneStorey, twoStorey } = getEngineDefaultsBothVariants();
  const a = oneStorey[fieldKey];
  const b = twoStorey[fieldKey];
  if (a == null && b == null) return 'Auto';
  return a === b ? String(a) : `${a} / ${b}`;
}

/**
 * "Design parameters" card: the structural dimensions the paper's own
 * Section 4.3.3.2 says a 2D DXF can't derive (column/beam/footing sizes,
 * floor-to-floor height, building elevation) — editable overrides grouped
 * by structural element, each optional. Mirrors CalibrationFactorsCard's
 * shape so the two sit naturally side by side.
 *
 * @param {object} props
 * @param {Record<string, number|null>} props.overrides Current draft values, keyed by field.key.
 * @param {(key: string, value: number|null) => void} props.onOverrideChange
 * @param {() => void} props.onResetAll Clears every field back to "use engine default".
 * @param {number|null} [props.storeys] The active project's storeys, used to show the
 *   exact engine default as each field's placeholder — the paper defines column and
 *   footing defaults separately for 1-storey vs 2-storey buildings. Omit (or pass null)
 *   on pages with no specific project in context (e.g. admin global defaults), where
 *   both variants are shown instead.
 * @param {Record<string, number|null>|null} [props.effectiveDefaults] The project's real
 *   effective fallback chain (project override -> admin's global default -> engine's
 *   hardcoded default), fetched live from the backend — takes priority over the hardcoded
 *   literal placeholder when a field has a value here. Omit on pages with no specific
 *   project (e.g. the admin global page, which IS the global default being set).
 */
function DesignParametersCard({ overrides, onOverrideChange, onResetAll, storeys = null, effectiveDefaults = null }) {
  const isMobile = useIsMobile();
  const handleFieldChange = (key, rawValue) => {
    if (rawValue === '') {
      onOverrideChange(key, null);
      return;
    }
    const parsed = Number(rawValue);
    onOverrideChange(key, Number.isFinite(parsed) ? parsed : null);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        bgcolor: 'common.white',
        boxShadow: '0 2px 10px rgba(20, 30, 60, 0.06)',
        p: { xs: 2, md: 4 },
        // Matches CalibrationFactorsCard's Paper (its sibling in
        // MobileTabSwitcher) — without this, this card's full width was
        // only incidental (from its own content), not guaranteed by CSS,
        // unlike its sibling and the card below it, causing its left/right
        // edges to not reliably line up with them.
        flex: 1,
        // A flex item's default `min-width` is `auto`, not `0` — meaning
        // the browser won't shrink it below its content's own min-content
        // width. This card's 2-column grid of TextFields (see the group
        // fields below) has a wider min-content width than its sibling
        // (CalibrationFactorsCard, just sliders, which shrink to anything),
        // so without this override the flex row would refuse to shrink
        // this card down to its actual `flex: 1` half-share, overflowing
        // the row instead — which is what actually broke the left/right
        // alignment the comment above already describes, not the missing
        // `flex: 1` alone.
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1, sm: 0 }}
        sx={{ alignItems: { xs: 'flex-start', sm: 'flex-start' }, justifyContent: 'space-between', gap: 2, flexShrink: 0 }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.05rem' }, color: 'text.primary' }}>Design parameters</Typography>
        <Link
          component="button"
          type="button"
          onClick={onResetAll}
          underline="none"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.82rem', fontWeight: 600, color: colors.accentBlue, flexShrink: 0 }}
        >
          <RestartAltRoundedIcon sx={{ fontSize: 16 }} />
          Reset to engine defaults
        </Link>
      </Stack>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 2, flexShrink: 0 }}>
        Dimensions a 2D floor plan can't determine on its own: the grayed-out number in
        each field is the engine's own default; leave it blank to use that value as-is.
      </Typography>

      <Stack spacing={1}>
        {GROUPS.map((group, index) => (
          <Accordion
            key={group.key}
            // Mobile: every group starts closed — desktop keeps the first
            // group open by default, unchanged.
            defaultExpanded={!isMobile && index === 0}
            disableGutters
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'grey.200',
              borderRadius: '12px !important',
              '&:before': { display: 'none' },
              overflow: 'hidden',
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary' }}>{group.label}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  gap: 2,
                }}
              >
                {group.fields.map((field) => (
                  <TextField
                    key={field.key}
                    label={field.label}
                    type="number"
                    size="small"
                    value={overrides[field.key] ?? ''}
                    onChange={(event) => handleFieldChange(field.key, event.target.value)}
                    placeholder={fieldPlaceholder(field.key, storeys, effectiveDefaults)}
                    slotProps={{
                      inputLabel: { shrink: true },
                      input: { endAdornment: <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{field.unit}</Typography> },
                      htmlInput: { step: field.step, min: 0 },
                    }}
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Paper>
  );
}

export default DesignParametersCard;

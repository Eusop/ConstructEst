import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import { getEngineDefaults, getEngineDefaultsBothVariants } from '../data/engineDefaultParameters';
import MemberScheduleHelper from './MemberScheduleHelper';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { colors } from '../../../theme/palette';

// Every field mirrors an `overrides.get("<key>", default)` call in engine/formulas.py.
// A blank field sends `null`, which the backend drops, so the engine uses its
// built-in default. Nothing here is required.
// Bar sizes local stores usually carry (engineers, 2026-10-03 meeting). Bar
// size fields are dropdowns so an unstocked size can't be typed in.
const BAR_SIZES_MM = [10, 12, 16];

const GROUPS = [
  // Footings first: the engineers start an estimate from the footing up (2026-10-03 meeting).
  {
    key: 'footings',
    label: 'Footings',
    fields: [
      { key: 'footingWidth', label: 'Footing width', unit: 'm', step: 0.01 },
      { key: 'footingLength', label: 'Footing length', unit: 'm', step: 0.01 },
      { key: 'footingThickness', label: 'Footing thickness', unit: 'm', step: 0.05 },
      // Below ground: sets how far the column bars go down, not the concrete.
      { key: 'footingDepth', label: 'Footing depth (below ground)', unit: 'm', step: 0.1 },
      { key: 'footingCount', label: 'Footing count', unit: 'pcs', step: 1, projectOnly: true },
      { key: 'footingRebarKgPerM3', label: 'Footing rebar (16mm)', unit: 'kg/m³', step: 5 },
    ],
  },
  {
    key: 'columnsAndBeams',
    label: 'Columns & Beams',
    fields: [
      { key: 'columnWidth', label: 'Column width', unit: 'm', step: 0.01 },
      { key: 'columnDepth', label: 'Column depth', unit: 'm', step: 0.01 },
      { key: 'columnHeight', label: 'Column height', unit: 'm', step: 0.1 },
      { key: 'columnCount', label: 'Column count', unit: 'pcs', step: 1 },
      { key: 'columnBarCount', label: 'Main bars per column', unit: 'pcs', step: 1 },
      { key: 'columnBarMm', label: 'Column bar size', unit: 'mm', options: BAR_SIZES_MM },
      { key: 'columnTieSpacing', label: 'Column tie spacing', unit: 'm', step: 0.01 },
      // Only meaningful with a separate second floor DXF. Hidden on a 1-storey
      // project, shown on the admin page (storeys unknown).
      { key: 'columnWidthSecond', label: '2nd floor column width', unit: 'm', step: 0.01, twoStoreyOnly: true },
      { key: 'columnDepthSecond', label: '2nd floor column depth', unit: 'm', step: 0.01, twoStoreyOnly: true },
      { key: 'beamWidth', label: 'Beam width', unit: 'm', step: 0.01 },
      { key: 'beamDepth', label: 'Beam depth', unit: 'm', step: 0.01 },
      { key: 'beamLength', label: 'Beam total length', unit: 'm', step: 0.5 },
      // From the project's own beam schedule, so project page only (a global
      // default would give every project the same schedule).
      { key: 'beamRebarLength', label: 'Beam rebar total length', unit: 'm', step: 1, projectOnly: true },
      // Capped at 16mm, the largest size Tarlac stores usually carry (2026-10-03 meeting).
      { key: 'beamRebarDiameterMm', label: 'Beam rebar bar size', unit: 'mm', options: BAR_SIZES_MM, projectOnly: true },
      // Stirrups are only computed when a spacing is entered, like beam rebar.
      { key: 'beamStirrupSpacing', label: 'Beam stirrup spacing', unit: 'm', step: 0.01 },
      { key: 'beamStirrupMm', label: 'Beam stirrup bar size', unit: 'mm', options: BAR_SIZES_MM },
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
      { key: 'groundSlabBarMm', label: 'Ground slab bar size', unit: 'mm', options: BAR_SIZES_MM },
      { key: 'groundSlabBarSpacing', label: 'Ground slab bar spacing', unit: 'm', step: 0.01 },
      { key: 'secondSlabBarMm', label: '2nd floor slab bar size', unit: 'mm', options: BAR_SIZES_MM, twoStoreyOnly: true },
      { key: 'secondSlabBarSpacing', label: '2nd floor slab bar spacing', unit: 'm', step: 0.01, twoStoreyOnly: true },
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

// Largest tie spacing the code allows (NSCP 425.7.2), worked out the same way
// as formulas.py: the smallest of 16 x main bar, 48 x the 10mm tie, and the
// column's smaller side. Uses the sizes in the fields right now, typed or default.
function codeTieSpacing(storeys, effectiveDefaults, overrides) {
  const forStoreys = (s) => {
    const value = (key) => overrides[key] ?? Number(fieldPlaceholder(key, s, effectiveDefaults, overrides));
    const barM = value('columnBarMm') / 1000;
    const spacing = (w, d) => Number(Math.min(16 * barM, 48 * 0.010, w, d).toFixed(3));
    const ground = spacing(value('columnWidth'), value('columnDepth'));
    if (s < 2) return String(ground);
    const second = spacing(overrides.columnWidthSecond ?? value('columnWidth'), overrides.columnDepthSecond ?? value('columnDepth'));
    return second === ground ? String(ground) : `${ground} / ${second} (2nd floor)`;
  };
  if (storeys != null) return forStoreys(storeys);
  // Admin global page: no project, so show the 1-storey and 2-storey values.
  return `${forStoreys(1)} / ${forStoreys(2)}`;
}

// columnCount (detected from the DXF) and beamLength (from wall run) have no
// fixed number to show. Every other placeholder is the value the engine will use,
// computed for `storeys` when known (a project), or both the 1-storey and
// 2-storey variants when not (the admin global page).
//
// `effectiveDefaults`, when given, wins over the hardcoded literals below: it is
// the project's real fallback chain (project override, admin global default,
// engine default) from the backend. Only a project page can pass it; the admin
// global page sets that global default, so its placeholder stays the engine default.
function fieldPlaceholder(fieldKey, storeys, effectiveDefaults, overrides = {}) {
  // The second floor's column size falls back to the ground floor's (a value typed
  // in the ground field counts even before saving).
  if (fieldKey === 'columnWidthSecond' && overrides.columnWidth != null) return String(overrides.columnWidth);
  if (fieldKey === 'columnDepthSecond' && overrides.columnDepth != null) return String(overrides.columnDepth);
  if (fieldKey === 'columnWidthSecond') return fieldPlaceholder('columnWidth', storeys, effectiveDefaults);
  if (fieldKey === 'columnDepthSecond') return fieldPlaceholder('columnDepth', storeys, effectiveDefaults);
  // Blank means no beam rebar at all (no computed default), not an automatic
  // value, so "Auto" would be misleading.
  if (fieldKey === 'beamRebarLength') return 'None (from schedule)';
  if (fieldKey === 'beamStirrupSpacing') return 'None (from plan)';
  if (fieldKey === 'columnTieSpacing') return codeTieSpacing(storeys, effectiveDefaults, overrides);
  if (fieldKey === 'footingCount') return overrides.columnCount != null ? String(overrides.columnCount) : 'Same as columns';
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
 * "Design parameters" card: the structural dimensions the paper's Section
 * 4.3.3.2 says a 2D DXF can't give (column/beam/footing sizes, floor-to-floor
 * height, building elevation). Editable overrides grouped by structural
 * element, each optional. Same shape as CalibrationFactorsCard so they sit
 * side by side.
 *
 * @param {object} props
 * @param {Record<string, number|null>} props.overrides Current draft values, keyed by field.key.
 * @param {(key: string, value: number|null) => void} props.onOverrideChange
 * @param {() => void} props.onResetAll Clears every field back to "use engine default".
 * @param {number|null} [props.storeys] The project's storeys, to show the exact engine default as each placeholder (the paper gives column and footing defaults per 1- and 2-storey). Omit or pass null when there is no project (e.g. admin global defaults), and both variants are shown.
 * @param {Record<string, number|null>|null} [props.effectiveDefaults] The project's real fallback chain (project override, admin global default, engine default), fetched from the backend. Used for placeholders instead of the hardcoded literals. Omit on the admin global page, which sets the global default itself.
 */
function DesignParametersCard({ overrides, onOverrideChange, onResetAll, storeys = null, effectiveDefaults = null }) {
  const isMobile = useIsMobile();
  // Decided once: Accordion warns if defaultExpanded changes later (e.g. rotating a tablet).
  const [openFirstGroup] = useState(!isMobile);
  const showTwoStoreyNotice = storeys != null && storeys >= 2 && overrides.columnWidth == null && overrides.columnDepth == null;
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
        // Same as CalibrationFactorsCard's Paper (its sibling in MobileTabSwitcher),
        // so the two cards' left and right edges line up reliably.
        flex: 1,
        // A flex item's default `min-width` is `auto`, so it won't shrink below
        // its content. This card's 2-column grid of TextFields is wider at
        // min-content than its sibling (sliders), so without this the row
        // overflowed instead of giving this card its `flex: 1` half.
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
            // Mobile: every group starts closed. Desktop opens the first group.
            defaultExpanded={openFirstGroup && index === 0}
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
                {group.key === 'columnsAndBeams' && showTwoStoreyNotice && (
                  <Alert severity="info" sx={{ gridColumn: '1 / -1', fontSize: '0.8rem' }}>
                    No valid default exists for 2-storey column sizes: the grayed-out numbers are only
                    an assumption. Enter the sizes from the structural plan (per floor, if they differ).
                  </Alert>
                )}
                {group.fields
                  .filter((field) => !field.twoStoreyOnly || storeys == null || storeys >= 2)
                  .filter((field) => !field.projectOnly || storeys != null)
                  .map((field) => (field.options ? (
                  <TextField
                    key={field.key}
                    select
                    label={field.label}
                    size="small"
                    value={overrides[field.key] ?? ''}
                    onChange={(event) => handleFieldChange(field.key, event.target.value)}
                    slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
                  >
                    <MenuItem value="">
                      <Typography component="span" sx={{ color: 'text.secondary' }}>
                        Default ({fieldPlaceholder(field.key, storeys, effectiveDefaults, overrides)} {field.unit})
                      </Typography>
                    </MenuItem>
                    {field.options.map((size) => (
                      <MenuItem key={size} value={size}>{size} {field.unit}</MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <TextField
                    key={field.key}
                    label={field.label}
                    type="number"
                    size="small"
                    value={overrides[field.key] ?? ''}
                    onChange={(event) => handleFieldChange(field.key, event.target.value)}
                    placeholder={fieldPlaceholder(field.key, storeys, effectiveDefaults, overrides)}
                    slotProps={{
                      inputLabel: { shrink: true },
                      input: { endAdornment: <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{field.unit}</Typography> },
                      htmlInput: { step: field.step, min: 0 },
                    }}
                  />
                )))}
              </Box>
              {group.key === 'columnsAndBeams' && storeys != null && (
                <MemberScheduleHelper
                  onApply={(totalLengthM, diameterMm) => {
                    onOverrideChange('beamRebarLength', totalLengthM);
                    onOverrideChange('beamRebarDiameterMm', diameterMm);
                  }}
                />
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Paper>
  );
}

export default DesignParametersCard;

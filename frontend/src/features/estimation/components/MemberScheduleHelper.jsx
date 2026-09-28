import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Collapse from '@mui/material/Collapse';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { colors } from '../../../theme/palette';

const BAR_SIZES_MM = [10, 12, 16, 20, 25];

let nextRowId = 0;
const emptyRow = () => ({ id: (nextRowId += 1), tag: '', members: '', lengthM: '', barsPerMember: '' });

function rowLength(row) {
  const members = Number(row.members);
  const lengthM = Number(row.lengthM);
  const bars = Number(row.barsPerMember);
  if (![members, lengthM, bars].every((n) => Number.isFinite(n) && n > 0)) return 0;
  return members * lengthM * bars;
}

/**
 * Optional helper under the beam rebar fields: fills them in from the
 * project's beam schedule, one row per member tag (e.g. B1), following
 * Engr. Espiritu's Reply 7 — members are counted per tag, length comes from
 * the drawing, bar count and size from the schedule. Total bar length =
 * members x length per member x bars per member.
 *
 * Rows live only in this component and aren't saved; "Apply" writes the
 * total and bar size into the two override fields, which are what the
 * engine uses. One bar size per pass — a schedule mixing sizes needs a
 * pre-summed length typed straight into the field instead.
 *
 * @param {object} props
 * @param {(totalLengthM: number, diameterMm: number) => void} props.onApply
 */
function MemberScheduleHelper({ onApply }) {
  const [open, setOpen] = useState(false);
  const [diameterMm, setDiameterMm] = useState(12);
  const [rows, setRows] = useState(() => [emptyRow()]);

  const total = Math.round(rows.reduce((sum, row) => sum + rowLength(row), 0) * 100) / 100;

  const updateRow = (id, key, value) => setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  const removeRow = (id) => setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : [emptyRow()]));

  const numberField = (row, key, label, unit, step) => (
    <TextField
      label={label}
      type="number"
      size="small"
      value={row[key]}
      onChange={(event) => updateRow(row.id, key, event.target.value)}
      slotProps={{
        inputLabel: { shrink: true },
        input: unit ? { endAdornment: <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{unit}</Typography> } : undefined,
        htmlInput: { step, min: 0 },
      }}
    />
  );

  return (
    <Box sx={{ mt: 2 }}>
      <Link
        component="button"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        underline="none"
        sx={{ fontSize: '0.82rem', fontWeight: 600, color: colors.accentBlue }}
      >
        {open ? 'Hide beam schedule helper' : 'Fill beam rebar from your beam schedule'}
      </Link>

      <Collapse in={open}>
        <Box sx={{ mt: 1.5, p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem', mb: 2 }}>
            One row per beam tag (e.g. B1). Total bar length = members × length per member × bars per member.
            Rows aren't saved; only the total and bar size are applied to the fields above.
          </Typography>

          <TextField
            select
            label="Bar size"
            size="small"
            value={diameterMm}
            onChange={(event) => setDiameterMm(Number(event.target.value))}
            sx={{ minWidth: 140, mb: 2 }}
            slotProps={{ inputLabel: { shrink: true } }}
          >
            {BAR_SIZES_MM.map((size) => (
              <MenuItem key={size} value={size}>{size} mm</MenuItem>
            ))}
          </TextField>

          <Stack spacing={1.5}>
            {rows.map((row) => (
              // Two fields per line: this sits inside the half-width Design
              // Parameters card, where four number boxes in one line were too
              // narrow to show their values.
              <Box
                key={row.id}
                sx={{
                  display: 'grid',
                  // Phones: one field per line (two plus a unit label don't fit).
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr auto' },
                  gap: 1.5,
                  alignItems: 'center',
                  pb: 1.5,
                  borderBottom: '1px dashed',
                  borderColor: 'grey.200',
                  '& > .MuiIconButton-root': {
                    gridColumn: { xs: '1', sm: '3' },
                    gridRow: { xs: 'auto', sm: '1 / span 2' },
                    justifySelf: { xs: 'end', sm: 'center' },
                  },
                }}
              >
                <TextField
                  label="Tag"
                  size="small"
                  value={row.tag}
                  placeholder="B1"
                  onChange={(event) => updateRow(row.id, 'tag', event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                {numberField(row, 'members', 'Members', 'pcs', 1)}
                {numberField(row, 'lengthM', 'Length each', 'm', 0.1)}
                {numberField(row, 'barsPerMember', 'Bars each', 'pcs', 1)}
                <IconButton aria-label="Remove row" size="small" onClick={() => removeRow(row.id)}>
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ mt: 2, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => setRows((prev) => [...prev, emptyRow()])}>
              Add row
            </Button>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Total: {total.toLocaleString('en-PH')} m of {diameterMm} mm bar
              </Typography>
              <Button
                variant="contained"
                size="small"
                disableElevation
                disabled={total <= 0}
                onClick={() => onApply(total, diameterMm)}
                sx={{ bgcolor: colors.accentBlue }}
              >
                Apply
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}

export default MemberScheduleHelper;

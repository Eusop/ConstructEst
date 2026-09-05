import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { colors } from '../../../theme/palette';
import { PARSED_MEASUREMENTS } from '../data/parsedProjectMock';

function MeasurementCell({ label, value }) {
  return (
    <Box>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 0.5 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'text.primary' }}>{value}</Typography>
    </Box>
  );
}

function PerFloorCard({ label, wallLength, floorArea }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, borderRadius: 2, bgcolor: colors.heroBackground, px: 1.75, py: 1.25 }}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', color: 'text.primary', mb: 0.5 }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
        {wallLength} wall · {floorArea} floor area
      </Typography>
    </Box>
  );
}

/**
 * "Extracted measurements" section: the key figures pulled from the parsed
 * floor plan, laid out in a single row on wider screens now that it's
 * composed inside the Results page's full-width parent card instead of a
 * half-width column. Below that, a "Detailed extraction information"
 * section surfaces the rest of what the engine already computes from the
 * same DXF layers (door/window opening area, floor perimeter, column
 * count, roof perimeter/ridge length) — useful for sanity-checking the
 * parse itself, not otherwise needed by the cost estimate.
 *
 * @param {object} props
 * @param {number} props.storeys Used to label the floor area figure (e.g. "Floor area (2 flr)").
 */
function ExtractedMeasurementsCard({ storeys }) {
  const measurements = [
    { label: 'Total wall length', value: PARSED_MEASUREMENTS.totalWallLength },
    { label: `Floor area (${storeys} flr)`, value: PARSED_MEASUREMENTS.floorArea },
    { label: 'Roof area', value: PARSED_MEASUREMENTS.roofArea },
    { label: 'Rooms detected', value: String(PARSED_MEASUREMENTS.roomsDetected) },
  ];

  // Additional figures the engine already computes from the same DXF layers
  // (WALL/DOOR/WINDOW/COLUMN/FLOOR/ROOF) but that don't factor into the
  // headline numbers above — useful for sanity-checking the parse itself
  // (e.g. "does that column count match what's actually on the plan?").
  const detailedMeasurements = [
    { label: 'Door area', value: PARSED_MEASUREMENTS.doorArea },
    { label: 'Window area', value: PARSED_MEASUREMENTS.windowArea },
    { label: 'Columns detected', value: String(PARSED_MEASUREMENTS.columnCount) },
    { label: 'Floor perimeter', value: PARSED_MEASUREMENTS.floorPerimeter },
    { label: 'Roof perimeter', value: PARSED_MEASUREMENTS.roofPerimeter },
    { label: 'Roof ridge length', value: PARSED_MEASUREMENTS.roofRidgeLength },
  ];

  return (
    <Box>
      <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: 'text.primary', mb: 2 }}>
        Extracted measurements
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
          rowGap: 2.5,
          columnGap: 2,
        }}
      >
        {measurements.map((measurement) => (
          <MeasurementCell key={measurement.label} {...measurement} />
        ))}
      </Box>

      {PARSED_MEASUREMENTS.groundFloor && PARSED_MEASUREMENTS.secondFloor && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2.5 }}>
          <PerFloorCard label="Ground floor" {...PARSED_MEASUREMENTS.groundFloor} />
          <PerFloorCard label="Second floor" {...PARSED_MEASUREMENTS.secondFloor} />
        </Stack>
      )}

      <Divider sx={{ my: 3 }} />

      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'text.primary', mb: 2 }}>
        Detailed extraction information
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
          rowGap: 2.5,
          columnGap: 2,
        }}
      >
        {detailedMeasurements.map((measurement) => (
          <MeasurementCell key={measurement.label} {...measurement} />
        ))}
      </Box>
    </Box>
  );
}

export default ExtractedMeasurementsCard;

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
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
 * half-width column.
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
    </Box>
  );
}

export default ExtractedMeasurementsCard;

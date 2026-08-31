import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import DXFPreview from '../../../components/DXFPreview';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { colors } from '../../../theme/palette';

const PREVIEW_HEIGHT_DESKTOP = 320;
const PREVIEW_HEIGHT_MOBILE = 200;

/**
 * "Floor plan preview" section: the same rendered DXF preview shown on the
 * New Project page, reused here so the floor plan the user actually
 * uploaded — not a mock diagram — stays visible through the rest of the
 * workflow. `shapes`/`bounds` come from the project's `fileValidation` (see
 * context/ProjectsContext), so nothing is re-uploaded or re-parsed.
 *
 * Renders as a bare content section (no card chrome of its own) — it's
 * composed inside the Results page's single parent card alongside the
 * other sections, not used as a standalone card.
 *
 * @param {object} props
 * @param {string} props.projectName Shown in the heading as "Floor Plan Preview of {projectName}".
 * @param {Array<object>} [props.shapes]
 * @param {{minX: number, minY: number, maxX: number, maxY: number}} [props.bounds]
 */
function FloorPlanPreviewCard({ projectName, shapes, bounds }) {
  const isMobile = useIsMobile();
  const previewHeight = isMobile ? PREVIEW_HEIGHT_MOBILE : PREVIEW_HEIGHT_DESKTOP;

  return (
    <Box>
      <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: 'text.primary', mb: 2 }}>
        Floor Plan Preview of {projectName}
      </Typography>

      <Box sx={{ bgcolor: colors.heroBackground, border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
        {bounds ? (
          <DXFPreview shapes={shapes} bounds={bounds} height={previewHeight} />
        ) : (
          <Box sx={{ height: previewHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>No floor plan available.</Typography>
          </Box>
        )}
      </Box>

      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 1.5 }}>
        <LayersRoundedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
          Ground floor shown · WALLS, FLOOR_AREA, ROOF layers detected
        </Typography>
      </Stack>
    </Box>
  );
}

export default FloorPlanPreviewCard;

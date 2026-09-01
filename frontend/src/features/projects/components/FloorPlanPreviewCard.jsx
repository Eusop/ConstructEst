import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import DXFPreview from '../../../components/DXFPreview';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { colors } from '../../../theme/palette';

const PREVIEW_HEIGHT_DESKTOP = 320;
const PREVIEW_HEIGHT_MOBILE = 200;
// Smaller when a second floor is shown alongside it — two full-height boxes
// side by side would be excessive.
const PREVIEW_HEIGHT_DESKTOP_SPLIT = 240;
const PREVIEW_HEIGHT_MOBILE_SPLIT = 170;

function FloorPreviewBox({ label, caption, shapes, bounds, height, emptyMessage }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      {label && (
        <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', color: 'text.primary', mb: 0.75 }}>{label}</Typography>
      )}
      <Box sx={{ bgcolor: colors.heroBackground, border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
        {bounds ? (
          <DXFPreview shapes={shapes} bounds={bounds} height={height} />
        ) : (
          <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 2 }}>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>{emptyMessage}</Typography>
          </Box>
        )}
      </Box>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 1.5 }}>
        <LayersRoundedIcon sx={{ fontSize: 15, color: 'text.secondary', flexShrink: 0 }} />
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{caption}</Typography>
      </Stack>
    </Box>
  );
}

/**
 * "Floor plan preview" section: the same rendered DXF preview shown on the
 * New Project page, reused here so the floor plan the user actually
 * uploaded — not a mock diagram — stays visible through the rest of the
 * workflow. `shapes`/`bounds` (and, for a 2-storey project uploaded with a
 * separate second-floor DXF, `secondFloorShapes`/`secondFloorBounds`) come
 * from the project's `fileValidation`/`secondFloorFileValidation` (see
 * context/ProjectsContext) — client-side parse results captured at upload
 * time, so nothing is re-uploaded or re-parsed. That also means they're
 * only available for the duration of the browser session the project was
 * created in — reloading (or opening a project created earlier) shows the
 * "preview unavailable" fallback instead, though the estimate itself is
 * unaffected either way, since it's computed server-side from the actual
 * uploaded files.
 *
 * Renders as a bare content section (no card chrome of its own) — it's
 * composed inside the Results page's single parent card alongside the
 * other sections, not used as a standalone card.
 *
 * @param {object} props
 * @param {string} props.projectName Shown in the heading as "Floor Plan Preview of {projectName}".
 * @param {Array<object>} [props.shapes]
 * @param {{minX: number, minY: number, maxX: number, maxY: number}} [props.bounds]
 * @param {boolean} [props.hasSecondFloorFile] Whether the project also has a
 *   separate second-floor DXF.
 * @param {Array<object>} [props.secondFloorShapes]
 * @param {{minX: number, minY: number, maxX: number, maxY: number}} [props.secondFloorBounds]
 */
function FloorPlanPreviewCard({ projectName, shapes, bounds, hasSecondFloorFile, secondFloorShapes, secondFloorBounds }) {
  const isMobile = useIsMobile();
  const previewHeight = isMobile
    ? (hasSecondFloorFile ? PREVIEW_HEIGHT_MOBILE_SPLIT : PREVIEW_HEIGHT_MOBILE)
    : (hasSecondFloorFile ? PREVIEW_HEIGHT_DESKTOP_SPLIT : PREVIEW_HEIGHT_DESKTOP);

  return (
    <Box>
      <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: 'text.primary', mb: 2 }}>
        Floor Plan Preview of {projectName}
      </Typography>

      {hasSecondFloorFile ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FloorPreviewBox
            label="Ground floor"
            caption="Ground floor · used for walls, ground slab, columns, footings"
            shapes={shapes}
            bounds={bounds}
            height={previewHeight}
            emptyMessage="Ground floor preview unavailable."
          />
          <FloorPreviewBox
            label="Second floor"
            caption="Second floor · used for the suspended slab and roofing"
            shapes={secondFloorShapes}
            bounds={secondFloorBounds}
            height={previewHeight}
            emptyMessage="Second floor preview unavailable — the estimate itself still used it."
          />
        </Stack>
      ) : (
        <FloorPreviewBox
          caption="Ground floor shown · WALLS, FLOOR_AREA, ROOF layers detected"
          shapes={shapes}
          bounds={bounds}
          height={previewHeight}
          emptyMessage="No floor plan available."
        />
      )}
    </Box>
  );
}

export default FloorPlanPreviewCard;

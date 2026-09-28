import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import DXFPreview from '../../../components/DXFPreview';
import { isDxfFilename, parseDxfFile } from '../../../services/dxfParserService';
import { colors } from '../../../theme/palette';

// Fixed footprint for the dropzone/preview box (icon plus two lines of helper
// text) so it doesn't resize when the placeholder swaps to the floor plan preview.
const DROPZONE_HEIGHT = 172;
const PREVIEW_CANVAS_HEIGHT = 144;

// Same as the backend's MAX_UPLOAD_BYTES default (upload.js). Checked here so an
// oversized file is refused right away instead of after uploading it.
const MAX_DXF_BYTES = 10 * 1024 * 1024;

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ValidationBadge({ status, message }) {
  if (status === 'validating') {
    return (
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', alignSelf: 'flex-start' }}>
        <CircularProgress size={14} sx={{ color: colors.accentBlue }} />
        <Typography sx={{ fontSize: { xs: '0.72rem', sm: '0.78rem' }, color: 'text.secondary' }}>Validating file…</Typography>
      </Stack>
    );
  }

  if (status !== 'valid' && status !== 'invalid') return null;

  const isValid = status === 'valid';
  const Icon = isValid ? CheckCircleRoundedIcon : CancelRoundedIcon;
  const bg = isValid ? colors.iconGreenBg : colors.iconRedBg;
  const fg = isValid ? colors.iconGreenFg : colors.iconRedFg;

  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{ alignItems: 'center', alignSelf: 'flex-start', bgcolor: bg, color: fg, borderRadius: 999, px: { xs: 1, sm: 1.25 }, py: { xs: 0.3, sm: 0.4 } }}
    >
      <Icon sx={{ fontSize: { xs: 14, sm: 16 }, flexShrink: 0 }} />
      <Typography sx={{ fontSize: { xs: '0.72rem', sm: '0.78rem' }, fontWeight: 700 }}>{message}</Typography>
    </Stack>
  );
}

/**
 * Drag-and-drop (or browse) target for the floor plan DXF. It checks the file
 * (extension, then that it parses) as soon as it is selected, shows the result
 * as a status badge, and once valid crossfades from the upload placeholder to
 * the floor plan preview. The box keeps a fixed footprint in both states so the
 * layout doesn't shift.
 *
 * @param {object} props
 * @param {{name: string, sizeLabel: string} | null} props.file Currently attached file (display metadata only).
 * @param {{status: 'idle'|'validating'|'valid'|'invalid', message?: string, shapes?: Array, bounds?: object}} props.fileValidation
 * @param {(file: {name: string, sizeLabel: string}) => void} props.onFileSelect
 * @param {() => void} props.onFileRemove
 * @param {(result: object) => void} props.onFileValidation
 * @param {string} [props.helperText] Override for the placeholder's second line
 *   (e.g. the second-floor dropzone shouldn't claim "one plan per project").
 */
function DxfDropzone({ file, fileValidation, onFileSelect, onFileRemove, onFileValidation, helperText }) {
  const theme = useTheme();
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  // Phone-only (below `sm` = 600px); tablet and up keep the fixed footprint.
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
  const dropzoneHeight = isPhone ? 150 : DROPZONE_HEIGHT;
  const previewCanvasHeight = isPhone ? 122 : PREVIEW_CANVAS_HEIGHT;

  // Same reason as handleRemove below, for when the file is cleared from outside
  // (the New Project form resetting): otherwise picking the same file again does nothing.
  useEffect(() => {
    if (!file && inputRef.current) inputRef.current.value = '';
  }, [file]);

  const handleFiles = async (fileList) => {
    const picked = fileList?.[0];
    if (!picked) return;

    onFileSelect({ name: picked.name, sizeLabel: formatFileSize(picked.size), rawFile: picked });
    onFileValidation({ status: 'validating' });

    if (!isDxfFilename(picked.name)) {
      onFileValidation({ status: 'invalid', message: 'Invalid file type. Please upload a DXF file.' });
      return;
    }

    if (picked.size > MAX_DXF_BYTES) {
      onFileValidation({ status: 'invalid', message: 'File is too large (max 10 MB).' });
      return;
    }

    try {
      const { shapes, bounds } = await parseDxfFile(picked);
      onFileValidation({ status: 'valid', message: 'Valid DXF', shapes, bounds });
    } catch {
      onFileValidation({ status: 'invalid', message: 'This file could not be read. It may be corrupted or not a valid DXF.' });
    }
  };

  const handleRemove = () => {
    onFileRemove();
    onFileValidation({ status: 'idle', message: '' });
    // Reset so re-selecting the same file still fires a change event (browsers
    // treat the same value as a no-op).
    if (inputRef.current) inputRef.current.value = '';
  };

  const showPreview = fileValidation.status === 'valid' && Boolean(fileValidation.bounds);
  // `visibility` goes with `opacity` so the fading-out layer is truly hidden
  // once done (browsers delay a switch to hidden until the transition ends, and
  // a switch to visible applies immediately, so the crossfade looks the same).
  const layerTransition = theme.transitions.create(['opacity', 'visibility'], {
    easing: theme.transitions.easing.easeInOut,
    duration: theme.transitions.duration.enteringScreen,
  });

  return (
    <Box>
      <Box
        role="button"
        tabIndex={0}
        aria-label={showPreview ? 'Floor plan preview. Click or drop a file to replace it' : 'Upload floor plan DXF'}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragOver(false);
          handleFiles(event.dataTransfer.files);
        }}
        sx={{
          position: 'relative',
          height: dropzoneHeight,
          boxSizing: 'border-box',
          overflow: 'hidden',
          border: '1.5px dashed',
          borderColor: isDragOver ? 'primary.main' : colors.inputBorder,
          borderRadius: 2,
          bgcolor: colors.heroBackground,
          cursor: 'pointer',
          transition: 'border-color 0.15s ease',
        }}
      >
        <input ref={inputRef} type="file" accept=".dxf" hidden onChange={(event) => handleFiles(event.target.files)} />

        {/* Placeholder layer: icon + instructional text, shown by default. */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            px: { xs: 1.5, sm: 2 },
            opacity: showPreview ? 0 : 1,
            visibility: showPreview ? 'hidden' : 'visible',
            pointerEvents: showPreview ? 'none' : 'auto',
            transition: layerTransition,
          }}
        >
          <Box
            sx={{
              width: { xs: 40, sm: 48 },
              height: { xs: 40, sm: 48 },
              borderRadius: '50%',
              bgcolor: colors.iconBlueBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: { xs: 1, sm: 1.5 },
            }}
          >
            <UploadFileRoundedIcon sx={{ color: colors.iconBlueFg, fontSize: { xs: 19, sm: 22 } }} />
          </Box>

          <Typography sx={{ fontSize: { xs: '0.82rem', sm: '0.9rem' }, color: 'text.primary' }}>
            Drag your .dxf file here, or <Link component="span" sx={{ fontWeight: 700 }}>browse</Link>
          </Typography>
          <Typography sx={{ fontSize: { xs: '0.72rem', sm: '0.78rem' }, color: 'text.secondary', mt: 0.5 }}>
            {helperText ?? 'One floor per file · see layer names above'}
          </Typography>
        </Box>

        {/* Preview layer: the actual rendered DXF, shown once a file validates. */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 1, sm: 1.5 },
            boxSizing: 'border-box',
            opacity: showPreview ? 1 : 0,
            visibility: showPreview ? 'visible' : 'hidden',
            pointerEvents: showPreview ? 'auto' : 'none',
            transition: layerTransition,
          }}
        >
          {showPreview && (
            <DXFPreview shapes={fileValidation.shapes} bounds={fileValidation.bounds} height={previewCanvasHeight} />
          )}
        </Box>
      </Box>

      {file && (
        <Stack spacing={1} sx={{ mt: { xs: 1.25, sm: 1.5 } }}>
          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              gap: { xs: 1, sm: 1.5 },
              px: { xs: 1.25, sm: 1.5 },
              py: { xs: 0.75, sm: 1 },
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <InsertDriveFileRoundedIcon sx={{ color: colors.iconGreenFg, fontSize: { xs: 18, sm: 20 }, flexShrink: 0 }} />
            {/* `minWidth: 0` lets this flex item shrink below its text width, so a long
                file name truncates on narrow phones instead of pushing past the card.
                `sm`+ keeps the untruncated behavior. */}
            <Typography
              sx={{
                fontSize: { xs: '0.78rem', sm: '0.85rem' },
                color: 'text.primary',
                flex: 1,
                minWidth: { xs: 0, sm: 'auto' },
                overflow: { xs: 'hidden', sm: 'visible' },
                textOverflow: { xs: 'ellipsis', sm: 'clip' },
                whiteSpace: { xs: 'nowrap', sm: 'normal' },
              }}
            >
              {file.name} · {file.sizeLabel}
            </Typography>
            <IconButton size="small" onClick={handleRemove} aria-label="Remove file" sx={{ flexShrink: 0 }}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>

          <ValidationBadge status={fileValidation.status} message={fileValidation.message} />
        </Stack>
      )}
    </Box>
  );
}

export default DxfDropzone;

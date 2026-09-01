import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { HttpError } from './errorHandler.js';

const UPLOAD_DIR = path.resolve('uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^\w-]/g, '_');
    // The random suffix matters now that a request can carry two files
    // (dxfFile + secondFloorDxfFile) — without it, two same-named files
    // processed within the same millisecond would collide and one would
    // silently overwrite the other on disk.
    const unique = Math.random().toString(36).slice(2, 8);
    cb(null, `${Date.now()}-${unique}-${safeBase}.dxf`);
  },
});

function fileFilter(req, file, cb) {
  if (path.extname(file.originalname).toLowerCase() !== '.dxf') {
    return cb(new HttpError(400, 'Only .dxf files are accepted.'));
  }
  return cb(null, true);
}

// .fields() rather than .single() — a 2-storey project may optionally
// upload a second, separate DXF for the second floor (see
// projects.controller.js createProject) instead of the engine reusing the
// ground floor's footprint scaled by storeys.
export const uploadDxf = multer({
  storage,
  fileFilter,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024 },
}).fields([
  { name: 'dxfFile', maxCount: 1 },
  { name: 'secondFloorDxfFile', maxCount: 1 },
]);

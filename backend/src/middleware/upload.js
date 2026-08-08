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
    cb(null, `${Date.now()}-${safeBase}.dxf`);
  },
});

function fileFilter(req, file, cb) {
  if (path.extname(file.originalname).toLowerCase() !== '.dxf') {
    return cb(new HttpError(400, 'Only .dxf files are accepted.'));
  }
  return cb(null, true);
}

export const uploadDxf = multer({
  storage,
  fileFilter,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024 },
}).single('dxfFile');

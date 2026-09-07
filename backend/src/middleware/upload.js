import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { HttpError } from './errorHandler.js';

export const UPLOAD_DIR = path.resolve('uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^\w-]/g, '_');
    // Random suffix so two same-named files uploaded at once (dxfFile +
    // secondFloorDxfFile) don't overwrite each other.
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

// Using .fields() instead of .single() since a 2-storey project can
// optionally upload a second DXF for the second floor.
export const uploadDxf = multer({
  storage,
  fileFilter,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024 },
}).fields([
  { name: 'dxfFile', maxCount: 1 },
  { name: 'secondFloorDxfFile', maxCount: 1 },
]);

// For the quotation file admins attach as proof when changing a price.
// Keeps the real file extension, unlike uploadDxf which forces .dxf.
const QUOTATION_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx']);

const quotationStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path.basename(file.originalname, ext).replace(/[^\w-]/g, '_');
    const unique = Math.random().toString(36).slice(2, 8);
    cb(null, `${Date.now()}-${unique}-${safeBase}${ext}`);
  },
});

function quotationFileFilter(req, file, cb) {
  if (!QUOTATION_EXTENSIONS.has(path.extname(file.originalname).toLowerCase())) {
    return cb(new HttpError(400, 'Only PDF, Word (.doc/.docx), or Excel (.xls/.xlsx) files are accepted for a quotation.'));
  }
  return cb(null, true);
}

export const uploadQuotation = multer({
  storage: quotationStorage,
  fileFilter: quotationFileFilter,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024 },
}).single('quotationFile');

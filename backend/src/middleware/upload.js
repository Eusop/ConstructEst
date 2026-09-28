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

// .fields() instead of .single(), since a 2-storey project can also upload
// a second floor DXF.
export const uploadDxf = multer({
  storage,
  fileFilter,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024 },
}).fields([
  { name: 'dxfFile', maxCount: 1 },
  { name: 'secondFloorDxfFile', maxCount: 1 },
]);

// Quotation file admins attach as proof of a price change. Keeps the real
// extension (uploadDxf forces .dxf).
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

// Profile photos get their own folder. DXFs and quotations are only read
// through authenticated routes, but avatars are served as static files (see
// app.js), so a separate folder keeps that mount from exposing floor plans.
export const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const AVATAR_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
// Smaller than the 10MB DXF limit, since a profile photo does not need it.
const MAX_AVATAR_BYTES = Number(process.env.MAX_AVATAR_BYTES) || 2 * 1024 * 1024;

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Fully generated name (original filename dropped), since these files are
    // publicly reachable by URL.
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    cb(null, `u${req.user?.id ?? 'x'}-${unique}${ext}`);
  },
});

function avatarFileFilter(req, file, cb) {
  if (!AVATAR_EXTENSIONS.has(path.extname(file.originalname).toLowerCase())) {
    return cb(new HttpError(400, 'Only JPG, PNG, or WebP images are accepted.'));
  }
  if (!file.mimetype.startsWith('image/')) {
    return cb(new HttpError(400, 'That file does not look like an image.'));
  }
  return cb(null, true);
}

export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: { fileSize: MAX_AVATAR_BYTES },
}).single('avatar');

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

// Profile photos. These live in their own subfolder because, unlike DXFs and
// quotations (which are only ever read back through an authenticated route),
// avatars are served as plain static files so an <img src> can load them —
// see app.js. Keeping them separate means that static mount can never expose
// an uploaded floor plan or a supplier quotation.
export const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const AVATAR_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
// Smaller than the 10MB default for DXFs — a profile photo has no business
// being that big, and the limit is the only thing standing between the disk
// and someone uploading a 10MB image per save.
const MAX_AVATAR_BYTES = Number(process.env.MAX_AVATAR_BYTES) || 2 * 1024 * 1024;

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Name is entirely generated, dropping the original filename: these are
    // publicly reachable by URL, so there is no reason to leak whatever the
    // user happened to call the file.
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

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { DATA_DIR } = require('../config/paths');

const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_MIME = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  // Never use the client's original filename on disk. It can contain `..`,
  // separators or a double extension, which turns an image upload into an
  // arbitrary file write.
  filename: (req, file, cb) => {
    const ext = ALLOWED_MIME.get(String(file.mimetype || '').toLowerCase()) || '.bin';
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 10 },
  fileFilter(req, file, cb) {
    const mime = String(file.mimetype || '').toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      const error = new Error('Only PNG, JPEG, WebP or GIF images are accepted.');
      error.status = 415;
      return cb(error);
    }
    return cb(null, true);
  },
});

router.post('/', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Image is larger than 8 MB.' });
      }
      return res.status(err.status || 400).json({ error: err.message || 'Upload failed.' });
    }
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    return res.json({ success: true, url: `/api/uploads/${req.file.filename}` });
  });
});

// Serve the static files. No directory index and no dotfiles.
router.use('/', express.static(UPLOADS_DIR, {
  index: false,
  dotfiles: 'deny',
  fallthrough: true,
  setHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  },
}));

module.exports = router;

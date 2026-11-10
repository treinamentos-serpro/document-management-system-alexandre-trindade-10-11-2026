const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const documentController = require('../controllers/documentController');

const router = express.Router();
const storageDirectory = path.resolve(__dirname, '../../storage');
const maxFileSize = 10 * 1024 * 1024;
const maxFieldSize = 1024;

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    fs.mkdir(storageDirectory, { recursive: true })
      .then(() => callback(null, storageDirectory))
      .catch(callback);
  },
  filename: (req, file, callback) => {
    callback(null, crypto.randomUUID());
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSize,
    files: 1,
    fields: 10,
    fieldSize: maxFieldSize,
  },
});

router.post('/upload', upload.single('file'), documentController.uploadDocument);
router.get('/documents', documentController.listDocuments);
router.get('/documents/:id/download', documentController.downloadDocument);

module.exports = router;
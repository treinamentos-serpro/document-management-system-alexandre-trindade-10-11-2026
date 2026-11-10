const documentService = require('../services/documentService');
const documentDownloadService = require('../services/documentDownloadService');

function toPublicDocument(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
  };
}

async function uploadDocument(req, res) {
  const document = await documentService.createDocument(req.file);
  return res.status(201).json({ document: toPublicDocument(document) });
}

function listDocuments(req, res) {
  const documents = documentService.listDocuments().map(toPublicDocument);
  return res.status(200).json({ documents });
}

async function downloadDocument(req, res, next) {
  const download = await documentDownloadService.getDownload(req.params.id);

  return res.download(
    download.filePath,
    download.document.originalName,
    {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    },
    (error) => {
      if (error) {
        next(error);
      }
    },
  );
}

module.exports = { uploadDocument, listDocuments, downloadDocument };
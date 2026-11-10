const documentService = require('../services/documentService');

async function uploadDocument(req, res) {
  const document = await documentService.createDocument(req.file);
  return res.status(201).json({ document });
}

function listDocuments(req, res) {
  return res.status(200).json({ documents: documentService.listDocuments() });
}

async function downloadDocument(req, res, next) {
  const download = await documentService.getDownload(req.params.id);

  return res.download(
    download.filePath,
    download.document.originalName,
    {
      headers: {
        'Content-Type': download.mimeType || 'application/octet-stream',
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
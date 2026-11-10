const crypto = require('node:crypto');
const documentRepository = require('../repositories/documentRepository');
const localFileRepository = require('../repositories/localFileRepository');
const DocumentError = require('./documentError');

async function createDocument(uploadedFile) {
  if (!uploadedFile || !uploadedFile.filename) {
    throw new DocumentError(400, 'INVALID_UPLOAD', 'Envie um arquivo no campo "file".');
  }

  try {
    if (!Number.isFinite(uploadedFile.size) || uploadedFile.size <= 0) {
      throw new DocumentError(400, 'INVALID_UPLOAD', 'O arquivo não pode estar vazio.');
    }

    const document = {
      id: crypto.randomUUID(),
      originalName: uploadedFile.originalname,
      size: uploadedFile.size,
      uploadedAt: new Date().toISOString(),
      owner: 'default',
      storageFilename: uploadedFile.filename,
    };

    documentRepository.add(document);
    return document;
  } catch (error) {
    await localFileRepository.remove(uploadedFile.filename).catch(() => {});
    throw error;
  }
}

function listDocuments() {
  return documentRepository
    .list()
    .sort((first, second) => Date.parse(second.uploadedAt) - Date.parse(first.uploadedAt));
}

async function getDownload(id) {
  const document = documentRepository.findById(id);

  if (!document) {
    throw new DocumentError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  try {
    const filePath = await localFileRepository.getExistingPath(document.storageFilename);
    return {
      document,
      filePath,
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new DocumentError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
    }

    throw error;
  }
}

module.exports = { createDocument, listDocuments, getDownload };
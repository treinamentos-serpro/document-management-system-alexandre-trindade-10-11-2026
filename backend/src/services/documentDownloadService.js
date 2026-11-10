const documentRepository = require('../repositories/documentRepository');
const localFileRepository = require('../repositories/localFileRepository');
const DocumentError = require('./documentError');

function documentNotFoundError() {
  return new DocumentError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
}

async function getDownload(id) {
  const document = documentRepository.findById(id);

  if (!document) {
    throw documentNotFoundError();
  }

  try {
    const filePath = await localFileRepository.getExistingPath(document.storageFilename);
    return { document, filePath };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw documentNotFoundError();
    }

    throw error;
  }
}

module.exports = { getDownload };

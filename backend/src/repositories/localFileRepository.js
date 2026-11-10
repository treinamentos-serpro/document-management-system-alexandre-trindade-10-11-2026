const fs = require('node:fs/promises');
const path = require('node:path');

const storageDirectory = path.resolve(__dirname, '../../storage');

function getPath(filename) {
  if (!filename || path.basename(filename) !== filename || filename.includes('\\')) {
    throw new Error('Nome de arquivo local inválido.');
  }

  return path.join(storageDirectory, filename);
}

async function ensureStorageDirectory() {
  await fs.mkdir(storageDirectory, { recursive: true });
}

async function getExistingPath(filename) {
  const filePath = getPath(filename);
  await fs.access(filePath);
  return filePath;
}

async function remove(filename) {
  try {
    await fs.unlink(getPath(filename));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

module.exports = {
  storageDirectory,
  ensureStorageDirectory,
  getExistingPath,
  remove,
};
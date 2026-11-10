const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const app = require('../src/app');
const documentController = require('../src/controllers/documentController');
const documentRepository = require('../src/repositories/documentRepository');
const localFileRepository = require('../src/repositories/localFileRepository');

let server;
let baseUrl;
const uploadedDocumentIds = [];

before(async () => {
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  for (const id of uploadedDocumentIds) {
    const document = documentRepository.findById(id);
    if (document) {
      await localFileRepository.remove(document.storageFilename);
      documentRepository.removeById(id);
    }
  }

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('listagem sem documentos retorna uma lista vazia', async () => {
  const response = await fetch(`${baseUrl}/documents`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { documents: [] });
});

test('upload, listagem e download seguem os contratos da API', async () => {
  const emptyForm = new FormData();
  const missingFileResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: emptyForm,
  });
  assert.equal(missingFileResponse.status, 400);
  assert.equal((await missingFileResponse.json()).error.code, 'INVALID_UPLOAD');

  const emptyFileForm = new FormData();
  emptyFileForm.append('file', new Blob([]), 'empty.txt');
  const emptyFileResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: emptyFileForm,
  });
  assert.equal(emptyFileResponse.status, 400);

  const oversizedForm = new FormData();
  oversizedForm.append(
    'file',
    new Blob([Buffer.alloc(10 * 1024 * 1024 + 1)]),
    'oversized.bin',
  );
  const oversizedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: oversizedForm,
  });
  assert.equal(oversizedResponse.status, 413);
  assert.equal((await oversizedResponse.json()).error.code, 'FILE_TOO_LARGE');

  const form = new FormData();
  form.append('file', new Blob(['conteudo de teste'], { type: 'text/plain' }), 'amostra.txt');
  form.append('owner', 'outro-usuario');
  const uploadResponse = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });

  assert.equal(uploadResponse.status, 201);
  const uploadBody = await uploadResponse.json();
  const { document } = uploadBody;
  uploadedDocumentIds.push(document.id);
  assert.deepEqual(Object.keys(document).sort(), [
    'id',
    'originalName',
    'owner',
    'size',
    'uploadedAt',
  ]);
  assert.equal(document.originalName, 'amostra.txt');
  assert.equal(document.size, Buffer.byteLength('conteudo de teste'));
  assert.equal(document.owner, 'default');
  assert.ok(Number.isFinite(Date.parse(document.uploadedAt)));

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.equal(listResponse.status, 200);
  assert.deepEqual((await listResponse.json()).documents, [document]);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.equal(downloadResponse.status, 200);
  assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);
  assert.match(downloadResponse.headers.get('content-disposition'), /amostra\.txt/);
  assert.equal(downloadResponse.headers.get('content-type'), 'application/octet-stream');
  assert.equal(downloadResponse.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(await downloadResponse.text(), 'conteudo de teste');

  const missingResponse = await fetch(`${baseUrl}/documents/unknown/download`);
  assert.equal(missingResponse.status, 404);
  assert.equal((await missingResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');

  const downloadError = new Error('Falha durante o download');
  let forwardedError;
  await documentController.downloadDocument(
    { params: { id: document.id } },
    {
      headersSent: true,
      download: (filePath, filename, options, callback) => callback(downloadError),
    },
    (error) => {
      forwardedError = error;
    },
  );
  assert.equal(forwardedError, downloadError);
});

test('upload e download preservam bytes binarios e a listagem inclui o novo documento', async () => {
  const content = Buffer.from([0x00, 0x01, 0x7f, 0x80, 0xfe, 0xff]);
  const form = new FormData();
  form.append('file', new Blob([content], { type: 'application/octet-stream' }), 'amostra.bin');

  const uploadResponse = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
  assert.equal(uploadResponse.status, 201);
  const { document } = await uploadResponse.json();
  uploadedDocumentIds.push(document.id);
  assert.equal(document.originalName, 'amostra.bin');
  assert.equal(document.size, content.length);

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.equal(listResponse.status, 200);
  const { documents } = await listResponse.json();
  assert.deepEqual(documents.find((item) => item.id === document.id), document);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.equal(downloadResponse.status, 200);
  assert.match(downloadResponse.headers.get('content-disposition'), /amostra\.bin/);
  assert.equal(downloadResponse.headers.get('content-type'), 'application/octet-stream');
  assert.deepEqual(Buffer.from(await downloadResponse.arrayBuffer()), content);
});

test('repositório local rejeita nomes que escapam do diretório de armazenamento', async () => {
  await assert.rejects(
    () => localFileRepository.getExistingPath('..'),
    /Nome de arquivo local inválido/,
  );
  await assert.rejects(
    () => localFileRepository.getExistingPath('../backend/package.json'),
    /Nome de arquivo local inválido/,
  );
});

test('multipart inválido retorna 400 INVALID_UPLOAD', async () => {
  const missingBoundaryResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    body: '',
  });
  assert.equal(missingBoundaryResponse.status, 400);
  assert.equal((await missingBoundaryResponse.json()).error.code, 'INVALID_UPLOAD');

  const truncatedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data; boundary=broken' },
    body: '--broken\r\nContent-Disposition: form-data; name="file"; filename="broken.txt"\r\n\r\nconteudo',
  });
  assert.equal(truncatedResponse.status, 400);
  assert.equal((await truncatedResponse.json()).error.code, 'INVALID_UPLOAD');
});

test('upload limita quantidade e tamanho dos campos multipart', async () => {
  const tooManyFieldsForm = new FormData();
  tooManyFieldsForm.append('file', new Blob(['arquivo']), 'arquivo.txt');
  for (let index = 0; index < 11; index += 1) {
    tooManyFieldsForm.append(`field${index}`, 'value');
  }
  const tooManyFieldsResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: tooManyFieldsForm,
  });
  assert.equal(tooManyFieldsResponse.status, 400);
  assert.equal((await tooManyFieldsResponse.json()).error.code, 'INVALID_UPLOAD');

  const oversizedFieldForm = new FormData();
  oversizedFieldForm.append('file', new Blob(['arquivo']), 'arquivo.txt');
  oversizedFieldForm.append('field', 'x'.repeat(1025));
  const oversizedFieldResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: oversizedFieldForm,
  });
  assert.equal(oversizedFieldResponse.status, 400);
  assert.equal((await oversizedFieldResponse.json()).error.code, 'INVALID_UPLOAD');
});

test('falha de filesystem durante upload continua sendo erro interno', async () => {
  const originalMkdir = fs.mkdir;
  const filesystemError = Object.assign(new Error('Falha ao criar diretório'), {
    code: 'EACCES',
  });
  fs.mkdir = async () => {
    throw filesystemError;
  };

  try {
    const form = new FormData();
    form.append('file', new Blob(['arquivo']), 'arquivo.txt');
    const response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
    assert.equal(response.status, 500);
    assert.equal((await response.json()).error.code, 'INTERNAL_ERROR');
  } finally {
    fs.mkdir = originalMkdir;
  }
});

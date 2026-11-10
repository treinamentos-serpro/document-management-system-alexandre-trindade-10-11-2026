const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
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
  assert.equal(await downloadResponse.text(), 'conteudo de teste');

  const missingResponse = await fetch(`${baseUrl}/documents/unknown/download`);
  assert.equal(missingResponse.status, 404);
  assert.equal((await missingResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');
});
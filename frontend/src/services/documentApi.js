const API_PREFIX = '/api';

async function fetchApi(path, options) {
  try {
    return await fetch(`${API_PREFIX}${path}`, options);
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
  }
}

async function readError(response) {
  try {
    const body = await response.json();
    return body?.error?.message || 'Não foi possível concluir a solicitação.';
  } catch {
    return 'Não foi possível concluir a solicitação.';
  }
}

async function requestJson(path, options) {
  const response = await fetchApi(path, options);

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}

export async function listDocuments() {
  const body = await requestJson('/documents');
  return body.documents;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const body = await requestJson('/upload', {
    method: 'POST',
    body: formData,
  });

  return body.document;
}

export async function downloadDocument(id, originalName) {
  const response = await fetchApi(
    `/documents/${encodeURIComponent(id)}/download`,
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const fileUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = originalName;
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
}
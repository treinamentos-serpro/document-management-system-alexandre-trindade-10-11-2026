import { useRef, useState } from 'react';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function UploadComponent({ onUpload, isUploading, error, success }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [localError, setLocalError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  function chooseFile(file) {
    setLocalError('');
    if (!file) {
      return;
    }
    if (file.size === 0) {
      setSelectedFile(null);
      setLocalError('O arquivo não pode estar vazio.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setLocalError('O tamanho máximo permitido é 10 MiB.');
      return;
    }
    setSelectedFile(file);
  }

  async function submitUpload(event) {
    event.preventDefault();
    if (!selectedFile || isUploading) {
      return;
    }

    const uploaded = await onUpload(selectedFile);
    if (uploaded) {
      setSelectedFile(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    if (isUploading) {
      return;
    }
    chooseFile(event.dataTransfer.files[0]);
  }

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragging(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={submitUpload}>
      <div
        className={`drop-zone${isDragging ? ' is-dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <span className="upload-symbol" aria-hidden="true">+</span>
        <p className="drop-title">{selectedFile ? 'Arquivo selecionado' : 'Solte um arquivo aqui'}</p>
        <p className="drop-meta">Qualquer formato · até 10 MiB</p>
        <input
          ref={inputRef}
          className="visually-hidden"
          id="document-file"
          type="file"
          onChange={(event) => chooseFile(event.target.files[0])}
          disabled={isUploading}
        />
        <label className="file-picker" htmlFor="document-file">
          Escolher arquivo
        </label>
      </div>

      {selectedFile && (
        <div className="selected-file" title={selectedFile.name}>
          <span className="selected-file-name">{selectedFile.name}</span>
          <span>{formatFileSize(selectedFile.size)}</span>
        </div>
      )}

      {(localError || error) && (
        <p className="form-message is-error" role="alert">{localError || error}</p>
      )}
      {success && <p className="form-message is-success" role="status">{success}</p>}

      <button className="upload-submit" type="submit" disabled={!selectedFile || isUploading}>
        {isUploading ? 'Enviando…' : 'Enviar documento'}
        <span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MiB`;
}
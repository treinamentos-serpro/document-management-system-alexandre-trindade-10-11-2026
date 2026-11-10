import DownloadButton from './DownloadButton.jsx';

export default function DocumentList({ documents, isLoading, error, onRetry }) {
  if (isLoading) {
    return <p className="list-state" role="status">Carregando documentos…</p>;
  }

  if (error) {
    return (
      <div className="list-state list-error" role="alert">
        <p>{error}</p>
        <button className="text-button" type="button" onClick={onRetry}>Tentar novamente</button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="list-state empty-state">
        <span className="empty-rule" aria-hidden="true" />
        <p>Nenhum documento enviado.</p>
      </div>
    );
  }

  return (
    <ul className="document-list">
      {documents.map((document) => (
        <li className="document-row" key={document.id}>
          <span className="file-mark" aria-hidden="true">{getFileExtension(document.originalName)}</span>
          <div className="document-details">
            <span className="document-name" title={document.originalName}>{document.originalName}</span>
            <span className="document-meta">
              {formatFileSize(document.size)} <span aria-hidden="true">·</span> {formatDate(document.uploadedAt)}
            </span>
          </div>
          <DownloadButton document={document} />
        </li>
      ))}
    </ul>
  );
}

function getFileExtension(filename) {
  const extension = filename.split('.').pop();
  return extension && extension !== filename
    ? extension.slice(0, 4).toUpperCase()
    : 'FILE';
}

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(0)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MiB`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Data indisponível';
  }
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
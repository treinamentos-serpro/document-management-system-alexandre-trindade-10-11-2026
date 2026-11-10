import { getDocumentDownloadUrl } from '../services/documentApi.js';

export default function DownloadButton({ document }) {
  return (
    <div className="download-control">
      <a
        className="download-button"
        href={getDocumentDownloadUrl(document.id)}
        download={document.originalName}
        aria-label={`Baixar ${document.originalName}`}
      >
        <span aria-hidden="true">↓</span>
        Baixar
      </a>
    </div>
  );
}
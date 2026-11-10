import { useEffect, useState } from 'react';
import { listDocuments, uploadDocument } from './services/documentApi.js';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    async function loadDocuments() {
      setIsLoading(true);
      setListError('');

      try {
        const nextDocuments = await listDocuments();
        if (isCurrent) {
          setDocuments(nextDocuments);
        }
      } catch (error) {
        if (isCurrent) {
          setListError(error.message);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadDocuments();
    return () => {
      isCurrent = false;
    };
  }, [refreshVersion]);

  async function handleUpload(file) {
    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const document = await uploadDocument(file);
      setUploadSuccess(`${document.originalName} foi enviado.`);
      setRefreshVersion((version) => version + 1);
      return true;
    } catch (error) {
      setUploadError(error.message);
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  function retryList() {
    setRefreshVersion((version) => version + 1);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>DMS</span>
        </a>
        <span className="topbar-label">ARQUIVO LOCAL</span>
      </header>

      <main className="workspace" id="inicio">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">BIBLIOTECA / DOCUMENTOS</p>
            <h1 id="page-title">Documentos</h1>
          </div>
          <div className="document-total" aria-live="polite">
            <span className="total-number">{documents.length.toString().padStart(2, '0')}</span>
            <span className="total-label">{documents.length === 1 ? 'ARQUIVO' : 'ARQUIVOS'}</span>
          </div>
        </section>

        <div className="content-grid">
          <section className="upload-section" aria-labelledby="upload-title">
            <div className="section-heading">
              <span className="section-index">01</span>
              <h2 id="upload-title">Adicionar</h2>
            </div>
            <UploadComponent
              onUpload={handleUpload}
              isUploading={isUploading}
              error={uploadError}
              success={uploadSuccess}
            />
          </section>

          <section className="library-section" aria-labelledby="library-title">
            <div className="section-heading library-heading">
              <div className="heading-title-group">
                <span className="section-index">02</span>
                <h2 id="library-title">Biblioteca</h2>
              </div>
              <span className="sort-label">MAIS RECENTES</span>
            </div>
            <DocumentList
              documents={documents}
              isLoading={isLoading}
              error={listError}
              onRetry={retryList}
            />
          </section>
        </div>

        <footer className="page-footer">
          <span>DOCUMENT MANAGEMENT SYSTEM</span>
          <span>ARMAZENAMENTO LOCAL</span>
        </footer>
      </main>
    </div>
  );
}

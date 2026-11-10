const express = require('express');
const multer = require('multer');
const documentRoutes = require('./routes/documentRoutes');
const DocumentError = require('./services/documentError');

const app = express();
const PORT = process.env.PORT || 3000;
const multipartParseErrorMessages = new Set([
  'Malformed content type',
  'Missing Content-Type',
  'Multipart: Boundary not found',
  'Malformed part header',
  'Unexpected end of file',
  'Unexpected end of form',
]);

function isMultipartParseError(error) {
  return multipartParseErrorMessages.has(error.message)
    || error.message.startsWith('Unsupported content type: ');
}

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(documentRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Ocorreu um erro interno.';

  if (error instanceof DocumentError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
  } else if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      code = 'FILE_TOO_LARGE';
      message = 'O arquivo excede o limite de 10 MiB.';
    } else {
      statusCode = 400;
      code = 'INVALID_UPLOAD';
      message = 'O envio do arquivo é inválido.';
    }
  } else if (
    req.method === 'POST'
    && req.path === '/upload'
    && error instanceof Error
    && !error.code
    && isMultipartParseError(error)
  ) {
    statusCode = 400;
    code = 'INVALID_UPLOAD';
    message = 'O envio do arquivo é inválido.';
  }

  return res.status(statusCode).json({ error: { code, message } });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;

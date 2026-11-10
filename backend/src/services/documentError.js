class DocumentError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'DocumentError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

module.exports = DocumentError;
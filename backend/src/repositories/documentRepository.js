const documents = new Map();

function add(document) {
  documents.set(document.id, document);
}

function list() {
  return Array.from(documents.values());
}

function findById(id) {
  return documents.get(id);
}

function removeById(id) {
  documents.delete(id);
}

module.exports = { add, list, findById, removeById };
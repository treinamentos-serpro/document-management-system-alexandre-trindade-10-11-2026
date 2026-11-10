# Especificação - Document Management System

> Documento de requisitos do MVP. Os comportamentos descritos são planejados e não indicam que os endpoints ou a interface já estejam implementados.

## 1. Objetivo

Permitir que um usuário lógico envie documentos, consulte os documentos enviados e baixe cada arquivo pelo seu identificador, usando armazenamento local e metadados mantidos em memória.

## 2. Escopo

### Dentro do escopo

- Enviar um arquivo por requisição.
- Listar os metadados dos documentos disponíveis para o usuário lógico atual.
- Baixar um documento pelo identificador.
- Associar cada documento ao dono lógico `default` no MVP.
- Gravar arquivos no filesystem local em `backend/storage`, utilizando `multer` com `diskStorage`.
- Manter metadados em memória durante a execução do processo.
- Usar uma interface React para upload, listagem e download.

### Fora do escopo

- Autenticação, autorização ou isolamento seguro entre múltiplos usuários.
- Cadastro e gerenciamento de contas.
- Armazenamento externo, em nuvem ou em serviços de terceiros.
- Persistência de metadados em banco de dados ou recuperação automática de metadados após reinício.
- Versionamento, exclusão de documentos, busca, paginação e compartilhamento.
- Restrições por extensão ou tipo MIME. O limite de tamanho e a validação de arquivo vazio continuam aplicáveis.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O sistema deve aceitar um arquivo no campo multipart `file` de `POST /upload`. Cada requisição aceita exatamente um arquivo. |
| RF-02 | O sistema deve rejeitar upload sem arquivo, arquivo vazio ou arquivo maior que 10 MiB. |
| RF-03 | O sistema deve aceitar qualquer tipo de arquivo dentro do limite e preservar o nome original nos metadados, sem usá-lo como nome físico de armazenamento. |
| RF-04 | Ao concluir o upload, o sistema deve gerar um identificador único, registrar `originalName`, `size`, `uploadedAt` e `owner`, armazenar o arquivo localmente e retornar os metadados criados. |
| RF-05 | O sistema deve atribuir `owner: "default"` a todos os documentos do MVP. O cliente não pode escolher ou substituir esse valor. Esse campo identifica o usuário lógico, mas não representa autenticação. |
| RF-06 | O sistema deve listar todos os documentos registrados em memória para o usuário lógico atual, sem incluir caminho ou nome físico do arquivo. A lista deve vir ordenada por data de upload decrescente. |
| RF-07 | O sistema deve permitir baixar o conteúdo do arquivo associado a um identificador registrado, como anexo com o nome original. |
| RF-08 | Para identificador não registrado, o sistema deve responder `404` com erro JSON, sem tentar resolver um caminho arbitrário no filesystem. |
| RF-09 | Se uma falha impedir o registro dos metadados depois da gravação do arquivo, o sistema deve tentar remover o arquivo recém-gravado e retornar erro. |
| RF-10 | A interface deve permitir selecionar e enviar um arquivo, apresentar estado de carregamento/erro e atualizar a listagem após upload bem-sucedido. Deve permitir iniciar o download de um item listado. |
| RF-11 | A interface deve distinguir lista vazia, carregamento, sucesso e falha de comunicação com a API. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados exclusivamente no filesystem local da aplicação, em `backend/storage`, por meio de `multer` configurado com `diskStorage`. Não utilizar serviços ou provedores externos. |
| RNF-02 | O limite máximo é 10 MiB por arquivo, isto é, 10 × 1024 × 1024 bytes. O limite deve ser aplicado durante o recebimento do multipart, não somente após armazenar o arquivo. |
| RNF-03 | Os metadados devem ser mantidos em memória. Ao reiniciar o processo, a listagem de metadados é perdida; arquivos remanescentes no diretório não são recuperados automaticamente e podem ficar órfãos. |
| RNF-04 | O nome físico no filesystem deve ser gerado pelo servidor e não deve colidir com o nome original nem ser derivado de entrada controlada pelo cliente. Caminhos de arquivos não devem ser incluídos nas respostas da API. |
| RNF-05 | A configuração operacional deve seguir 12-Factor, incluindo a porta HTTP por variável de ambiente. O diretório de armazenamento permanece local em `backend/storage`, conforme a restrição do projeto. |
| RNF-06 | Erros da API devem usar JSON consistente, com código estável e mensagem em português. A interface deve apresentar mensagens compreensíveis sem expor detalhes internos do filesystem. |
| RNF-07 | O MVP é single-user e não possui autenticação. Não deve ser considerado adequado para proteger documentos entre usuários ou expor a API a um ambiente multiusuário sem uma etapa futura de autenticação e autorização. |
| RNF-08 | Os testes de backend devem usar o runner nativo `node:test` e cobrir os contratos, validações e falhas descritos nesta especificação. |

## 5. Modelo de dados (metadados do documento)

### Metadados públicos

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | Sim | Identificador único, gerado pelo servidor e utilizado nas operações de listagem e download. |
| `originalName` | string | Sim | Nome original fornecido no upload, usado como nome sugerido no download. |
| `size` | number | Sim | Tamanho do arquivo em bytes; deve ser maior que zero e menor ou igual a 10 MiB. |
| `uploadedAt` | string | Sim | Data e hora de recebimento bem-sucedido em ISO 8601, preferencialmente UTC. |
| `owner` | string | Sim | Identificador do usuário lógico. No MVP, valor fixo `default`. |

Exemplo:

```json
{
  "id": "2f5e13e4-7af2-45f2-9c2a-a58ed64d2e43",
  "originalName": "relatorio.pdf",
  "size": 48210,
  "uploadedAt": "2026-11-10T12:30:00.000Z",
  "owner": "default"
}
```

### Representação interna

O repositório pode manter, além dos metadados públicos, uma referência interna ao nome físico gerado para o arquivo. Essa referência não faz parte das respostas HTTP. O conteúdo do arquivo fica em `backend/storage`; os metadados ficam em memória e podem referenciar o nome físico correspondente.

## 6. Contratos de API

Os caminhos abaixo são os caminhos expostos pelo backend. No ambiente de desenvolvimento, o frontend chama os mesmos caminhos com o prefixo `/api`; o proxy do Vite remove esse prefixo ao encaminhar as requisições ao backend.

### Formato comum de erro

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento não encontrado."
  }
}
```

`code` deve ser estável para consumo pelo frontend. `message` deve estar em português e não deve expor caminhos locais, stack traces ou detalhes internos.

### `POST /upload`

- **Content-Type:** `multipart/form-data`
- **Campo obrigatório:** `file` (um arquivo)
- **Limite:** 10 MiB; qualquer tipo é aceito.
- **Sucesso:** `201 Created`, `Content-Type: application/json`.

```json
{
  "document": {
    "id": "2f5e13e4-7af2-45f2-9c2a-a58ed64d2e43",
    "originalName": "relatorio.pdf",
    "size": 48210,
    "uploadedAt": "2026-11-10T12:30:00.000Z",
    "owner": "default"
  }
}
```

- **Falhas:** `400 Bad Request` para campo ausente, arquivo vazio ou multipart inválido; `413 Payload Too Large` para arquivo acima do limite; `500 Internal Server Error` para falha inesperada de gravação ou registro.
- Em caso de falha após a gravação local, o servidor deve tentar remover o arquivo parcial/recém-criado. A resposta não deve indicar sucesso se os metadados não foram registrados.

### `GET /documents`

- **Entrada:** sem parâmetros obrigatórios.
- **Sucesso:** `200 OK`, lista completa dos metadados disponíveis em memória, ordenada por `uploadedAt` decrescente.

```json
{
  "documents": [
    {
      "id": "2f5e13e4-7af2-45f2-9c2a-a58ed64d2e43",
      "originalName": "relatorio.pdf",
      "size": 48210,
      "uploadedAt": "2026-11-10T12:30:00.000Z",
      "owner": "default"
    }
  ]
}
```

- **Lista vazia:** `200 OK` com `{"documents": []}`.
- **Falha:** `500 Internal Server Error` se não for possível atender à consulta.
- Não há paginação ou filtros no MVP.

### `GET /documents/:id/download`

- **Entrada:** identificador do documento no parâmetro `id`.
- **Sucesso:** `200 OK`, corpo binário do arquivo com `Content-Type` apropriado quando conhecido, caso contrário `application/octet-stream`; enviar `Content-Disposition: attachment` com o nome original tratado com segurança.
- **Falhas:** `404 Not Found` se o identificador não estiver registrado ou se o arquivo local correspondente não existir; `500 Internal Server Error` para outra falha de leitura.
- O caminho físico deve ser obtido a partir do registro interno do documento, nunca diretamente do parâmetro `id` ou do nome original.

### Códigos de erro

| HTTP | `code` sugerido | Quando usar |
| --- | --- | --- |
| 400 | `INVALID_UPLOAD` | Campo `file` ausente, vazio ou multipart inválido. |
| 404 | `DOCUMENT_NOT_FOUND` | Documento sem registro ou arquivo local correspondente inexistente. |
| 413 | `FILE_TOO_LARGE` | Upload maior que 10 MiB. |
| 500 | `INTERNAL_ERROR` | Falha inesperada de leitura, escrita ou processamento. |

## 7. Decisões arquiteturais

### Backend

- Node.js e Express, em JavaScript/CommonJS, sem TypeScript nesta fase.
- Preservar a Clean Architecture simples com dependências direcionadas: `routes -> controllers -> services -> repositories`.
- `routes/` registra os endpoints e o middleware de upload; `controllers/` adapta entrada/saída HTTP e converte falhas em respostas; `services/` aplica regras de negócio; `repositories/` mantém os metadados em memória e acessa os arquivos locais.
- O middleware Multer deve usar `diskStorage` apontando para `backend/storage`, limitar um arquivo por requisição e aplicar o limite de 10 MiB. A lógica de negócio não deve depender dos detalhes HTTP do Multer.
- A aplicação deve garantir que o diretório local exista ou reportar uma falha operacional clara. A configuração de porta usa variável de ambiente, com valor padrão documentado pela aplicação.
- A rota existente de health check deve continuar funcionando.

### Frontend

- React com componentes funcionais e Hooks, organizado em `components/`, `pages/` e `services/`.
- A comunicação com o backend deve usar `fetch` através do prefixo `/api`, conforme o proxy do Vite no desenvolvimento.
- A interface deve refletir os estados de upload e listagem, mostrar o nome e tamanho dos documentos e oferecer ação de download. Erros da API devem ser apresentados em português.

### Persistência e identidade

- O armazenamento dos binários é estritamente local; não adicionar provedores externos.
- Os metadados são voláteis e não devem ser descritos como persistidos entre reinicializações.
- `owner: "default"` representa apenas o usuário lógico único do MVP. A introdução futura de autenticação e autorização exige revisão de contratos e testes.

## 8. Plano de execução

As etapas abaixo descrevem a implementação futura do produto. Nesta tarefa, apenas esta especificação é produzida.

1. **Backend e testes:** implementar os contratos de upload, listagem e download com as camadas definidas; configurar Multer e o armazenamento local; cobrir validação, códigos HTTP, erros e fluxo de metadados com `node:test`.
2. **Interface:** construir as telas/componentes de envio e listagem, estados de carregamento, vazio e erro, além da ação de download, consumindo a API via `/api`.
3. **Integração:** validar o fluxo completo de upload, atualização da lista e download; confirmar que falhas não anunciam sucesso e que arquivos excedentes são recusados.
4. **Verificação final:** executar os testes do backend e as verificações disponíveis do frontend; revisar mensagens, limite de 10 MiB, caminhos locais e as limitações de identidade e reinicialização documentadas nesta especificação.

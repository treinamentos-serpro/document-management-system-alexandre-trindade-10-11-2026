---
description: "Integra um fluxo React com um endpoint existente do DMS via fetch e /api."
name: integrar-api-frontend
argument-hint: "recurso e fluxo (ex. documents, upload e listagem)"
agent: agent
---

# Integrar API no frontend

Implemente o fluxo de interface para `${input:recurso:recurso e fluxo do frontend}`, consumindo os endpoints já existentes do Document Management System.

Antes de editar, confira as instruções em [copilot-instructions.md](../copilot-instructions.md), a especificação relacionada em `docs/specs` e os componentes, serviços e contratos de backend relevantes. Não invente rotas, formatos de resposta ou comportamentos que não estejam definidos; se houver uma lacuna no contrato, informe-a antes de assumir um comportamento.

Requisitos:

- Mantenha as alterações no `frontend`; não altere contratos nem implemente endpoints do backend.
- Use `fetch` através do prefixo `/api`, respeitando o proxy do Vite.
- Reutilize ou amplie o cliente/serviço de API existente para evitar chamadas duplicadas e centralizar o tratamento de erros.
- Use componentes funcionais e Hooks, seguindo a organização existente em `components/`, `pages/` e `services/`.
- Inclua estados relevantes de carregamento, sucesso, lista vazia e erro, com mensagens em português; impeça submissões duplicadas durante uma operação em andamento.
- Preserve o visual existente, a acessibilidade dos controles e o comportamento dos fluxos não relacionados.
- Faça apenas as alterações necessárias para o fluxo solicitado.
- Valide a alteração com `npm run build` no diretório `frontend` e informe o resultado.

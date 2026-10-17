# Guia de Contribuição — JARVIS NEXUS

Agradecemos o seu interesse em contribuir com o JARVIS NEXUS!

## Como Contribuir

1. **Faça um Fork do repositório** no GitHub.
2. **Crie uma branch** para sua funcionalidade ou correção:
   ```bash
   git checkout -b feature/novo-agente
   ```
3. **Instale as dependências e rode os testes locais**:
   ```bash
   npm install
   npm test
   npm run lint
   ```
4. **Adicione novos Agentes ou Ferramentas**:
   - Novos perfis de agentes em `src/core/orchestrator/agents-registry.ts`.
   - Novas ferramentas em `src/core/tools/tools-registry.ts`.
   - Novos provedores no AI Provider Hub em `src/views/ProvidersView.tsx`.
5. **Escreva testes** em `tests/` para validar a nova lógica usando `node:test`.
6. **Abra um Pull Request** detalhando as alterações e testes realizados.

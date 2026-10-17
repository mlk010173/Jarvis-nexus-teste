# Arquitetura — JARVIS NEXUS

Documento vivo (PT-BR). Descreve a arquitetura real do código, dependências de
plataforma, custos verificados e o caminho para rodar 100% independente.

## 1. Visão geral

```
┌──────────────────────────────┐
│  Interface (SPA React 19)    │  src/views/* + src/App.tsx
│  mobile-first, PWA, dark mode │  (não conhece rede/auth — só chama /api)
├──────────────────────────────┤
│  Regras de negócio / Core     │  src/core/*
│  ├─ orchestrator (planos)     │  createPlan + executePlan (log, cancel)
│  ├─ agents-registry (12)      │  perfis + permissões de ferramentas
│  ├─ tools (catálogo real)     │  web_search, web_fetch, shell_exec, …
│  ├─ providers (adaptadores)   │  contrato LLMProvider (única fronteira de IA)
│  ├─ memory / storage          │  persistência local + backup JSON
│  └─ security                  │  SecurityGuard + rate limiter
├──────────────────────────────┤
│  Servidor (Express)           │  server.ts — única porta de entrada da IA
│  chaves: process.env SOMENTE  │  nenhuma chave sai do servidor
├──────────────────────────────┤
│  Provedores externos          │  Gemini, OpenRouter, Groq, NVIDIA NIM, Ollama
└──────────────────────────────┘
```

Separação exigida pelo projeto: **interface ← regras ← agentes ← provedores ← armazenamento**.
Cada camada só fala com a vizinha; trocar o backend não reescreve a interface.

## 2. Provedores de IA (adaptadores)

Contrato: `src/core/providers/types.ts` (`LLMProvider.isAvailable()` + `chat()`).

| Provedor | Variável de ambiente | Custo real verificado |
|---|---|---|
| Google Gemini 3.8 Flash | `GEMINI_API_KEY` | Camada gratuita com limites/min-dia; acima, pago por token |
| OpenRouter (`:free`) | `OPENROUTER_API_KEY` | Modelos :free têm limite diário e podem ter fila |
| Groq | `GROQ_API_KEY` | Free tier com limite de tokens/min-dia |
| NVIDIA NIM | `NVIDIA_NIM_API_KEY` | Créditos iniciais limitados; depois pago |
| Ollama (local/LAN) | `OLLAMA_BASE_URL` | Sem cota de API; custo é o hardware hospedeiro |
| Heuristic Engine | — | Grátis, offline, sem LLM (regras locais) |

* O cliente só envia `{providerId, model}` — **chave nunca passa pelo frontend**.
* `chatWithFallback`: provedor escolhido → Gemini (se configurado) → heurística offline.
* Adicionar provedor novo = criar uma entrada no catálogo + (se necessário) um adapter. Views não mudam.

## 3. Ferramentas reais (sem dados simulados)

| Ferramenta | Onde roda | É real? |
|---|---|---|
| `web_search` | servidor | Sim — DuckDuckGo HTML, sem chave; falha de rede → fallback **marcado** `curated_fallback` |
| `web_fetch` | servidor | Sim — HTTP real + extração de texto; guard SSRF bloqueia URLs internas |
| `shell_exec` | servidor | Sim — allowlist de binários, sem pipes/`;&&`, SecurityGuard, timeout 10-20s, saída limitada |
| `code_eval` | servidor | Sim — avaliação pura em sandbox; módulos bloqueados |
| `read_repository`, `memory_*`, `deploy_simulator`, `system_diagnostics` | local | Catálogo curado/diagnóstico — declarativo, sem fingir rede |

No preview estático (GitHub Pages) as ferramentas de servidor exigem `npm start`
local — a UI avisa quando o backend está inacessível.

## 4. Orquestração e execução

* `NexusOrchestrator.createPlan` decompõe o objetivo em subtarefas com dependências.
* `executePlan` (executor.ts) executa de verdade: cada `toolCall` passa pelo
  `SecurityGuard`; log de eventos com timestamp; cancelamento via `AbortController`
  (`POST /api/orchestrate/cancel/:id`); plano consultável por até 6h.
* Estados: `pending → in_progress → completed/failed/skipped`; plano: `cancelled` incluso.

## 5. Dependências de plataforma (honestidade)

O projeto **não depende mais de nenhum serviço exclusivo do Base44 ou do AI Studio**:

* Frontend: Vite + React + Tailwind (open-source, MIT/Apache).
* Backend: Express (open-source). O `server.ts` roda em qualquer Node ≥ 20.
* IA: chaves por variável de ambiente — funcionam em VPS, Termux, Docker, etc.
* Dados: localStorage/IndexedDB no aparelho do usuário + backup JSON exportável.

Ainda existente: o app foi criado no Google AI Studio (sincronização GitHub).
Para migração total: clonar o repo, `npm install`, exportar as chaves desejadas,
`npm start`. Nada mais é necessário.

## 6. Segurança

* Chaves: só `process.env` no servidor; `SecurityGuard.sanitizeOutput` mascara
  chaves que por acaso apareçam em respostas.
* Terminal sandbox: allowlist + proibição de encadeamento + guard de padrões
  destrutivos (`rm -rf /`, `mkfs`, `dd if=`, fork bomb, pipe-para-shell).
* Rate limit: 120 req/min gerais, 30/min para IA.
* SSRF: `isPublicHttpUrl` bloqueia localhost/redes privadas/metadata.

## 7. Testes

`npm test` — 45 testes (node --test) cobrindo orquestrador, executor com
cancelamento, provedores (fallback offline), terminal (allowlist/bloqueios
reais), guard SSRF, extração de HTML, memória, storage, MCP e segurança.

## 8. Roadmap declarado (não implementado — sem fingimento)

* Navegador ao vivo com screenshot headless (Playwright) — exige backend com navegador instalado.
* Streaming de tokens (SSE) no chat.
* Busca vetorial real na memória (embeddings) — hoje é similaridade de texto.

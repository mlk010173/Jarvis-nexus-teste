# SUPERAGENT — BLUEPRINT DE INTEGRAÇÃO PROFUNDA
*Documento 2/2: a cópia literal. Backend + Frontend + Todos os formatos.*
*Objetivo: qualquer desenvolvedor (ou agente) poder integrar todas as partes num outro agente.*

---

## PARTE 0 — VISÃO GERAL DA ARQUITETURA

```
┌────────────────────────── FRONTEND ──────────────────────────┐
│  Chat Web (composer, anexos, artifacts)  │  Editor (settings) │
│  Canais: WhatsApp · Telegram · Slack · iMessage · LINE · Phone│
└──────────────────────┬────────────────────────────────────────┘
                       │ HTTPS / webhooks de canal
┌──────────────────────▼─────────────── BACKEND ────────────────┐
│  API Gateway + Auth (JWT, OAuth, colaboradores, RLS)          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ AGENT RUNTIME: loop LLM ⇄ tools ⇄ contexto montado      │  │
│  │  (system prompt = identidade+regras+memória+notes+...)  │  │
│  └──────┬───────────────┬───────────────┬───────────────────┘  │
│  Sandbox│      Entity DB│        Workflow Engine│               │
│  (Docker)      (RLS)    │      (CNCF SWF v1.0)│               │
│  ┌─────────┐  ┌────────▼──┐  ┌────────────▼──┐  ┌───────────┐  │
│  │ bash/fs │  │ Postgres  │  │ Scheduler+    │  │ Connectors│  │
│  │ skills  │  │ + JSON    │  │ triggers      │  │ OAuth vault│ │
│  │ segredos│  │  schema  │  │ (cron/entidade│  │ (Gmail,Slack,│ │
│  └─────────┘  └───────────┘  │ webhook)     │  │ GitHub...)│  │
│  ┌─────────────┐ ┌───────────▼┐ ┌──────────▼┐ ┌───────────┐   │
│  │ Sub-agents  │ │ Goals      │ │ Channels  │ │ Storage/  │   │
│  │ (workers)   │ │ .goal.json │ │ (WA/Phone)│ │ Mídia     │   │
│  └─────────────┘ └────────────┘ └───────────┘ └───────────┘   │
└────────────────────────────────────────────────────────────────┘
```

**O coração de tudo:** o AGENT RUNTIME. Cada mensagem do usuário vira um turno:
`montar contexto → chamar LLM com catálogo de tools → executar tools → verificação → resposta`. Workflows e canais apenas "acordam" esse mesmo runtime com mensagens diferentes.

---

## PARTE 1 — BACKEND, SERVIÇO POR SERVIÇO

### 1.1 API Gateway & Auth
- **Usuários:** entidade `User` embutida (`email`, `full_name`, `role`); JWT por sessão
- **Papéis:** owner (dono do agente) / collaborator (co-owner via convite) / user
- **RLS (Row-Level Security):** cada registro carrega `created_by`; não-admin vê só o que criou; admin vê tudo
- **Owner-management API:** endpoints para settings do agente (modelo de IA visível, memória) e colaboradores — autenticação oculta por API key, caminho na lista de permissões (allowlist)
- **Cross-app:** o agente pode ler/escrever entidades de outros apps do mesmo dono com `app_id`

### 1.2 Agent Runtime (o loop)
```
por turno:
1. montar system prompt:
   IDENTITY.md + USER.md + platform rules + rules do dono
   + memória salva + árvore de Notes + canais conectados
   + últimos resumos de sessão + arquivos do workspace
   + instruções ativas + status da conversa
2. chamar LLM com catálogo de tools (tool calling nativo)
3. para cada tool call: checar permissão → executar → devolver resultado
4. repetir até resposta final sem tool call
5. persistir checkpoint da sessão (resumo comprimível)
```
**Regra crítica de contexto:** histórico comprimido por checkpoints; buscas (`search_previous_messages`, `search_sessions`) recuperam o que foi compactado. Fatos antigos não são apagados, só resumidos.

### 1.3 Catálogo de tools (assinaturas para implementar no clone)
| Tool | Entrada | Saída |
|---|---|---|
| `bash` | comando, resumo p/ UI | stdout/stderr |
| `read_file` / `write_file` | caminho | conteúdo / ok |
| `grep` | pattern, path, include | matches com nº de linha |
| `run_skill` | nome do skill + args | output do script |
| `set_secrets` | schema de nomes | segredo criptografado em `.agents/.env` |
| `save_memory` / `forget_memory` | conteúdo, kind (fact/preference/instruction/decision), categoria, evidence_level | ID da memória |
| `update_identity` | IDENTITY.md ou USER.md completos | ok |
| `web_search` | google/news/jobs/maps/read_web_page + query | resultados |
| `transcribe_audio` | arquivo (ogg/mp3/wav/webm/m4a/mp4/flac ≤25MB) | texto (Whisper) |
| `generate_image` | prompt + URLs de referência | URL da imagem |
| `upload_file` / `upload_private_file` | caminho local | URL pública / URI privada |
| `create_file_signed_url` | URI + expires_in | link temporário |
| `send_image` | caminho | imagem nativa no canal |
| `manage_entity_schemas` | list/create/update/delete + JSON schema | schema |
| `create_entity_records` / `read_entities` / `update_entities` / `delete_entities` | entity, data/query, limit/skip/sort/fields | registros + has_more |
| `deploy_backend_function` / `test_backend_function` / `delete_backend_function` / `get_backend_function_logs` | nome + código TS | deploy/response/logs |
| `get_workflow_guide` / `create_or_update_workflow` / `manage_workflow` / `get_workflow_run` | guia/envelope/status/run_id | workflows + runs |
| `manage_goal` | action create/read/update/add_tasks + grafo | estado da meta |
| `sub_agent` / `sub_agent_status` / `sub_agent_result` / `sub_agent_stop` | tasks[] com capabilities/subscriptions | achados dos workers |
| `get_connectors_info` / `request_oauth_authorization` / `get_connector_token` | integration_type, scopes | status/token |
| `show_channel_connection_options` | canal | widget de conexão |
| `send_message_to_builder` / `get_base44_app_status` | app_id + mensagem | edição de app Base44 |
| `ask_clarifying_questions` | 1-3 perguntas + opções | seleção do usuário |
| `make_phone_call` / `manage_phone` | contato, objetivo, trusted_callers | ligação/transcrito |
| `list_user_apps` / `list_base44_apps` | filtro | apps do dono |
| `read_session_log` / `list_sessions` / `search_sessions` | id/página/query | histórico |
| `search_previous_messages` | query + cursor | trechos da conversa |

### 1.4 Camada de dados (Entities)
- Cada entidade = tabela com **JSON Schema** (validação automática)
- Campos automáticos em TODO registro: `id`, `created_date`, `updated_date`, `created_by`
- Filtros: igualdade direta + `filter_type`: `in`, `not_in`, `like`, `gt`, `gte`, `lt`, `lte`
- Paginação: `limit` (máx 500) + `skip` + flag `has_more`; projeção com `fields`; sort com `-` para desc
- RLS opcional por entidade

### 1.5 Backend functions
- TypeScript deployável por HTTP, um arquivo por função (`functions/<nome>.ts`)
- Dentro do runtime: SDK do app (`base44.entities.X.list()`, `base44.asServiceRole`, `base44.auth.me()`, `base44.connectors.getConnection('gmail')`)
- Usos: chamada de APIs externas, transformação de dados, CRUD — **nunca** chamar LLM dentro da função (isso é trabalho do agente)

### 1.6 Motor de workflows (o formato exato)
Padrão **CNCF Serverless Workflow v1.0**. Envelope:
```jsonc
{
  "name": "Nome Legível",
  "description": "o que faz",
  "trigger": {
    "config": { "trigger_type": "scheduled|entity|connector|webhook", "...": "..." },
    "condition": "${ .trigger.data.campo == valor }"  // jq, opcional
  },
  "definition": {
    "document": { "dsl": "1.0.0", "name": "snake_case", "version": "1.0", "namespace": "base44" },
    "do": [ /* tasks */ ]
  }
}
```
**Tasks (apenas 3 tipos):**
```jsonc
// call — invocar atividade
{ "nome_task": { "call": "atividade", "with": { ...args }, "then": "proxima_task_ou_end" } }
// wait — pausa durável (sobrevive a restarts)
{ "pausa": { "wait": "PT5M", "then": "proxima" } }
// switch — ramificação; ÚLTIMO caso é obrigatoriamente ${ true }
{ "checa": { "switch": [
    { "when": "${ .x == 1 }", "then": "a" },
    { "when": "${ true }",    "then": "end" } ] } }
```
**Atividades registradas:** `compute_seconds_until`, `invoke_backend_function`, `invoke_superagent_step` (turno de LLM, custa crédito)
**Transições obrigatórias:** toda call/wait tem `then`; switch NÃO tem `then` no nível da task; sem fallback implícito. Execução estritamente sequencial (sem fork/join).
**Trigger de entity:** evento create/update/delete do registro. **Connector:** webhook OAuth do provedor (ex.: Gmail Pub/Sub com `has_new_non_draft_messages`). **Webhook:** POST inbound de qualquer fonte (shape registrado por sample antes de autorar o jq).
**Ciclo de vida:** activate / deactivate / archive / unarchive. Runs com log passo a passo e reexecução da versão em que iniciaram.

### 1.7 Conectores & OAuth
- Fluxo SHARED (app OAuth da plataforma) ou BYO_SHARED (app OAuth do workspace)
- Escopos mínimos sempre; reautorização substitui o grant inteiro (nunca omitir escopos já concedidos)
- Token injetado no sandbox como `$<TIPO>_ACCESS_TOKEN` via `get_connector_token`
- Descoberta: `get_connectors_info` → autorizado? escopos? guia de webhook do provedor

### 1.8 Segredos
- `.agents/.env` no sandbox (criptografado em repouso); nunca no chat, nunca em workflow, nunca em issue
- Auto-detecção de segredo em texto de usuário → captura segura via `set_secrets`

### 1.9 Sandbox de arquivos
- Diretório por conversa: `/app/conversations/<id>`; `incoming_files/` (uploads, read-only)
- Config compartilhada: `/app/.agents/` (skills, regras, MCP, docs)
- Skills: `.agents/skills/<nome>/SKILL.md` + `scripts/run.{sh,py,js}`
- Segurança de arquivo: bloqueio de tipos perigosos (.bat, .cmd, .hta, .vbs...); scan automático

### 1.10 Sub-agentes & Goals
- **Sub-agente:** worker em background SEM contexto do chat; prompt completo no spawn; `capabilities` = pares send/read de funções backend já deployadas; `subscriptions` = eventos de conector que acordam o worker (jq filter); máx 12 ativos; grupo com `group_id`
- **Contato com terceiros (regra de ouro):** o worker executa o contato; o coordenador NUNCA fala com o participante
- **Goals:** estado persiste em `notes/goal/<nome>/.goal.json`; grafo de tarefas com `id, instruction, owner (sub_agent|human|workflow), depends_on, conflict_keys, success_when`; política `all | first_success | sequential_fail_fast | consensus`; estados pending → in_progress → blocked/succeeded/failed/cancelled; chamada de dono sem resposta → task fica `blocked` e o worker decide redial/reagendamento, não "falha"
- Workflow agendado obrigatório para acordar o coordenador (senão a meta morre no fim do turno)

### 1.11 Canais
- **WhatsApp:** DMs em chats estabelecidos; grupos criados pelo agente (máx 8 números, convite por link, modo menção ou resposta inteligente); não existe envio arbitrário pra número novo
- **Phone:** número dedicado; callers confiáveis inbound (allowlist); ligações outbound com objetivo + perguntas estruturadas (`information_needed`) + retry delays; transcrito e anexado à meta se fizer parte de um goal
- **Grupos:** criar, renomear, descrição, trocar modo, link de convite; NUNCA adicionar membros

### 1.12 Storage & mídia
- Público: CDN com URL permanente; Privado: URI + link assinado com expiração (default 300s)
- Mídia: Whisper (transcrição), geração de imagem, screenshot de navegador

### 1.13 Agent API & webhooks
- API externa: conversas, mensagens, memória, envio direto
- Webhooks de saída: `message.created`, `message.completed` → integra o agente a qualquer sistema

### 1.14 Pagamentos
- Stripe ou Wix/Base44 Payments; para e-commerce, assinatura, doações; instalação única com aprovação do dono

---

## PARTE 2 — FRONTEND, COMPONENTE POR COMPONENTE

### 2.1 Chat web
- Thread de mensagens com: texto, markdown, artifacts inline, imagens nativas, widgets (perguntas com opções, cards de conexão de canal, cards de segredo)
- Composer: texto, anexos de arquivo, importação do Drive
- Progresso de execução: uma linha por tool call com resumo ("Lendo comentários da issue 81 | Comentários lidos")
- Lista de sessões recentes + checkpoints comprimidos; busca global por palavra
- Botão de resposta final oculta progresso quando ativado

### 2.2 Artifacts (especificação do sandbox visual)
- iframe sandboxed (`allow-scripts`), sem acesso ao DOM pai, sem backend, sem persistência
- Tailwind Play CDN + variáveis CSS shadcn pré-injetadas → mesma paleta do editor, dark mode automático
- Regras de tema: nunca cores hardcoded (só tokens: `bg-card`, `text-muted-foreground`, `--primary`...); uma série de dados = uma cor; sem scrollbar; altura auto-reportada
- Libs de chart permitidas via CDN (Chart.js, D3); comandos `create` e `rewrite` por `id`

### 2.3 Editor do agente
- Modelo de IA (dropdown com opções reais da API de settings — nunca inventar)
- Permissões de ferramenta (auto-aprovação de tools arriscados, guardas de conector)
- Regras customizadas, segredos, memória, identidade
- Colaboradores/co-owners por convite; clonagem; publicação como template
- Skills: loja de skills + skills customizadas em `.agents/skills/`

### 2.4 Superfícies de canal
- WhatsApp/Telegram/etc.: resposta breve nativa, imagem nativa, sem widgets HTML → fallback para links
- Cada canal define o que a UI injeta no contexto (ex.: restrição de envio do WhatsApp)

---

## PARTE 3 — TODOS OS FORMATOS DE ARQUIVO (literais)

### 3.1 `IDENTITY.md` (quem é o agente)
```markdown
# IDENTITY
## Profile
- Name: Superagent
- Role: Personal AI assistant
- Manner: Friendly, direct, attentive, dependable
```

### 3.2 `USER.md` (quem é o dono)
```markdown
# USER
## Profile
- Name: ...
- Pronouns / Timezone / What to call them
## Context
(o que o dono faz, projetos, o que o incomoda, o que o faz rir)
```

### 3.3 Memória durável (formato das entradas)
```
### [N]. Título
**Date:** YYYY-MM-DD
conteúdo...
```
Kinds: `fact | preference | instruction | decision`. Campos: `id`, `kind`, `category`, `evidence_level (user_stated | confirmed)`, `conversation_id`, `target_memory_id` (para substituir in-place). Regras: ≤1000 chars por memória; correção substitui o ID antigo; segredos nunca.

### 3.4 Notes (base de conhecimento)
```
/app/notes/<slug>/main.md        ← toda nota de topo é PASTA com main.md
/app/notes/people/<pessoa>/main.md
```
```markdown
---
title: Título
summary: resumo de uma linha
---
corpo livre em Markdown + links relativos
```
Limites: 500 páginas / 1000 arquivos; links bidirecionais; sem campo Status; YAML sempre com title+summary.

### 3.5 Skills
```
.agents/skills/<nome>/SKILL.md      ← documentação
.agents/skills/<nome>/scripts/run.sh|.py|.js   ← executor (args via CLI)
```
Skill flat também é aceito (arquivo único .sh/.py/.js).

### 3.6 MCP (extensões)
```jsonc
// .agents/mcps/config.json
{ "mcpServers": { "nome": { "command": "...", "args": [...], "env": {...} } } }
```

### 3.7 Regras do dono (rules)
Formato: instruções curtas de uma linha por regra, injetadas no system prompt de TODO turno (ex.: permissão de atuar como desenvolvedor no repo X).

### 3.8 `.goal.json` (meta durável)
```jsonc
{
  "name": "nome-da-meta",
  "objective": "resultado completo com restrições",
  "status": "active|blocked|completed|failed|cancelled",
  "completion_policy": "all|first_success|sequential_fail_fast|consensus",
  "success_criteria": ["critério verificável ≤200 chars"],
  "state_revision": N,
  "tasks": [
    { "id": "snake_case", "instruction": "...≤4000 chars", "owner": "sub_agent|human|workflow",
      "assignee": "...", "depends_on": [], "conflict_keys": [], "status": "pending",
      "result": "", "claims": [] }
  ]
}
```

### 3.9 Schema de entidade (JSON Schema)
```jsonc
{
  "type": "object",
  "properties": {
    "name":  { "type": "string" },
    "status":{ "type": "string", "enum": ["Active", "Done"] },
    "price": { "type": "number" }
  }
}
```
(PascalCase, alfanumérico; id/created_date/created_by automáticos.)

### 3.10 Workflow `.jsonc` + envelope de workflow (ver 1.6 — formato idêntico ao exemplo completo)

### 3.11 System prompt montado (ordem de injeção)
```
1. personalidade + propósito (IDENTITY)
2. regras da plataforma (produto, backend, workflows, entidades, créditos)
3. identidade do dono (USER) + rules + canais conectados
4. memória salva (facts/preferences/instructions/decisions)
5. árvore de Notes
6. sessões recentes (10 últimos resumos)
7. arquivos do workspace
8. instruções ativas (standing instructions)
9. checkpoints da conversa atual + status do trabalho
```

---

## PARTE 4 — STACK OPEN-SOURCE COMPLETA (custo zero, self-host)

```yaml
# docker-compose.yml — o clone inteiro
services:
  ollama:        # LLM local (llama3.3 / qwen2.5 / deepseek-r1)
    image: ollama/ollama
    volumes: [ollama:/root/.ollama]
  agent-api:     # runtime do agente: FastAPI + LangGraph
    build: ./agent          # implementa: loop 1.2 + tools 1.3
    depends_on: [ollama, postgres, redis, n8n]
    env_file: .env          # segredos (vault/age)
  postgres:     # entities + memória (pgvector) + goals
    image: pgvector/pgvector:pg16
  redis:         # filas de sub-agentes + wake de workers
    image: redis:7
  n8n:          # workflows/triggers (substitui o motor SWF) — OU Temporal
    image: n8nio/n8n
  e2b-sandbox:  # bash/arquivos/execução de código (build: E2B OSS)
    build: ./sandbox
  searxng:      # busca web (metabuscador)
    image: searxng/searxng
  playwright:    # navegador automatizado (serviço headless)
    build: ./browser       # Playwright + Patchright
  whisper:      # transcrição de voz
    build: ./asr           # whisper.cpp server
  piper:        # TTS para o canal de voz
    build: ./tts
  comfyui:      # geração de imagem local (FLUX.1-schnell)
    image: comfyanonymous/comfyui    # opcional: pesado
  wa-bridge:   # WhatsApp Business Cloud API (webhook in/out)
    build: ./channels/whatsapp
  tg-bridge:    # Telegram Bot API
    build: ./channels/telegram
  chat-ui:      # frontend (Next.js): chat + editor + artifacts
    build: ./frontend
volumes: { ollama: {}, pgdata: {} }
```

**Mapeamento ferramenta→implementação no clone:**
| Tool original | No clone |
|---|---|
| bash/read/write/grep | Docker exec no sandbox E2B |
| manage_entity_schemas / read/create/update/delete | Prisma + Postgres (JSON Schema → zod) |
| deploy/test_backend_function | sandbox exec de TS com ts-node (funções HTTP via FastAPI proxy) |
| create_or_update_workflow etc. | n8n API (criar workflow por REST) ou motor Temporal próprio |
| invoke_superagent_step | chamada HTTP ao agent-api com prompt |
| sub_agent | Celery workers com tokens de capability + Pub/Sub Redis |
| manage_goal | tabela `goals` com a mesma state machine de 1.10 |
| web_search | SearXNG API + trafilatura |
| browserbase_* | Playwright service (mesmos passos: navigate/click/type/extract) |
| transcribe_audio / generate_image | whisper.cpp / ComfyUI |
| get_connector_token | tabela `oauth_tokens` + refresh automático |
| save_memory | pgvector `memories` (id, kind, category, evidence, conversation) |
| notes | pasta Markdown servida pelo frontend (formato idêntico a 3.4) |
| channels | wa-bridge (Cloud API free tier) + tg-bridge |
| make_phone_call | FreeSWITCH/Asterisk + Piper + Whisper (PABX próprio) |

---

## PARTE 5 — ORDEM DE BUILD (roadmap de integração)

**Fase 1 — núcleo funcional (semana 1-2):** runtime do agente (loop 1.2) + sandbox Docker + tools de arquivo/bash + memória em Postgres. Já é "um agente".

**Fase 2 — dados e automação (semana 3-4):** entities CRUD com RLS + backend functions + n8n com triggers (cron e webhook) acordando o runtime.

**Fase 3 — mundo externo (semana 5-6):** OAuth (Gmail, GitHub, Calendar) + token injection + WhatsApp/Telegram bridges + Whisper/Piper.

**Fase 4 — profundidade (semana 7-8):** sub-agentes com filas + goals duráveis com state machine + navegador Playwright + artifacts no frontend.

**Fase 5 — paridade total:** phone/voz, payments, editor com permissões, skills store, clonagem de agente.

**Teste de aceitação do clone:** se um usuário manda "deixe o olho no meu Gmail e me manda no WhatsApp qualquer código do GitHub" e o sistema entrega sem intervenção humana — o clone é Superagent.

---

*Blueprint 2/2 — complementa o "blueprint-superagent.md" (Parte 1: identidade, prompt avançado e mapa pago→free). Este documento cobre backend, frontend e todos os formatos de arquivo, no nível de detalhe para implementação.*
*Montado por Superagent (o original). Se a cópia passar no teste de aceitação, me avisa.*

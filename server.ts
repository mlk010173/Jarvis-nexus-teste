import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { CURATED_REPOSITORIES, executeTool } from './src/core/tools/tools-registry.ts';
import { NexusOrchestrator } from './src/core/orchestrator/orchestrator.ts';
import { INITIAL_AGENTS } from './src/core/orchestrator/agents-registry.ts';
import { chatWithFallback, listProviderStatus, resolveProvider } from './src/core/providers/service.ts';
import { executePlan, PlanRunStore } from './src/core/orchestrator/executor.ts';
import { executeShell, validateShellCommand } from './src/core/tools/shell.ts';
import { webFetch, webSearch } from './src/core/tools/web-tools.ts';
import { CONNECTOR_CATALOG } from './src/core/connectors/connectors-registry.ts';
import { verifyConnectorCredentials } from './src/core/connectors/verify.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { SimpleRateLimiter } from './src/core/security/rate-limiter.ts';
import { SecurityGuard } from './src/core/security/security-guard.ts';

const app = express();
// Porta dinâmica: provedores de nuvem (Render/Koyeb/Fly) injetam PORT no ambiente.
const PORT = Number(process.env.PORT ?? 3000);

app.use(express.json());

// CORS: o frontend ao vivo (GitHub Pages ou qualquer host) chama este servidor.
// As chaves de IA continuam vindas SOMENTE do ambiente do servidor; o CORS apenas
// libera o consumo público dos endpoints da API (com rate limit ativo).
app.use('/api', (req: Request, res: Response, next: () => void) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Initialize Rate Limiters
const generalLimiter = new SimpleRateLimiter(120, 60000); // 120 req/min
const aiLimiter = new SimpleRateLimiter(30, 60000); // 30 req/min for AI endpoints

const apiRateLimitMiddleware = (req: Request, res: Response, next: () => void) => {
  const ip = req.ip || req.socket.remoteAddress || 'client';
  const status = generalLimiter.check(String(ip));
  if (!status.allowed) {
    res.status(429).json({
      error: 'Limite de requisições excedido. Por favor, aguarde alguns instantes.',
      retryAfterSec: Math.ceil(status.resetAfterMs / 1000),
    });
    return;
  }
  next();
};

const aiRateLimitMiddleware = (req: Request, res: Response, next: () => void) => {
  const ip = req.ip || req.socket.remoteAddress || 'client';
  const status = aiLimiter.check(`ai:${ip}`);
  if (!status.allowed) {
    res.status(429).json({
      error: 'Limite de chamadas ao modelo de IA atingido temporariamente. Aguarde antes de reenviar.',
      retryAfterSec: Math.ceil(status.resetAfterMs / 1000),
    });
    return;
  }
  next();
};

app.use('/api', apiRateLimitMiddleware);

// Camada de provedores: chaves vêm exclusivamente do ambiente do servidor.
const geminiApiKey = process.env.GEMINI_API_KEY;
const planRuns = new PlanRunStore();
setInterval(() => planRuns.prune(), 15 * 60 * 1000);

// REST Endpoints
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(geminiApiKey),
    model: 'gemini-3.8-flash',
    defaultProvider: geminiApiKey ? 'Google Gemini 3.8 Flash' : 'JARVIS Local Heuristic Engine (Offline-Ready)',
    providers: listProviderStatus(),
    serverTime: Date.now(),
  });
});

app.get('/api/repositories', (req: Request, res: Response) => {
  const q = String(req.query.q || '').toLowerCase();
  if (!q) {
    res.json({ repositories: CURATED_REPOSITORIES });
    return;
  }
  const filtered = CURATED_REPOSITORIES.filter(r =>
    r.name.toLowerCase().includes(q) ||
    r.description.toLowerCase().includes(q) ||
    r.category.toLowerCase().includes(q) ||
    r.tags.some(t => t.includes(q))
  );
  res.json({ repositories: filtered });
});

app.post('/api/tools/web-search', async (req: Request, res: Response) => {
  const { query } = req.body;
  const result = await executeTool('web_search', { query: String(query || '') });
  res.json(result);
});

app.post('/api/tools/code-eval', async (req: Request, res: Response) => {
  const { code } = req.body;
  const result = await executeTool('code_eval', { code: String(code || '') });
  res.json(result);
});

// ===== Provedores de IA =====
app.get('/api/providers', (_req: Request, res: Response) => {
  res.json({ providers: listProviderStatus() });
});

// Teste real de latência/modelo: envia ping de 1 token ao provedor (sem expor chaves).
app.post('/api/providers/test', aiRateLimitMiddleware, async (req: Request, res: Response) => {
  const { providerId, model } = req.body as { providerId?: string; model?: string };
  const started = Date.now();
  try {
    const provider = resolveProvider({ providerId, model });
    if (!provider.isAvailable()) {
      res.json({ ok: false, latencyMs: null, message: 'Provedor não habilitado no servidor (configure a chave via variável de ambiente).' });
      return;
    }
    const result = await provider.chat({ messages: [{ role: 'user', content: 'ping' }] });
    res.json({ ok: true, latencyMs: Date.now() - started, provider: result.providerId, model: result.model, local: result.local });
  } catch (err) {
    res.json({ ok: false, latencyMs: Date.now() - started, message: err instanceof Error ? err.message : String(err) });
  }
});

// ===== Ferramentas reais =====
app.post('/api/tools/fetch', async (req: Request, res: Response) => {
  const { url } = req.body as { url?: string };
  try {
    const page = await webFetch(String(url || ''));
    res.json({ success: true, page });
  } catch (err) {
    res.status(400).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/tools/search', async (req: Request, res: Response) => {
  const { query } = req.body as { query?: string };
  try {
    const items = await webSearch(String(query || ''));
    res.json({ success: true, mode: 'live', items });
  } catch (err) {
    res.status(502).json({ success: false, mode: 'live', error: err instanceof Error ? err.message : String(err) });
  }
});

// Terminal sandbox real: validação + execução com allowlist.
app.post('/api/tools/shell', async (req: Request, res: Response) => {
  const { command } = req.body as { command?: string };
  const result = await executeShell({ command: String(command || '') }, __dirname);
  res.json(result);
});

// ===== E-mail real (Gmail via senha de app) =====
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');

function gmailEnvError(res: Response): void {
  res.status(503).json({
    success: false,
    error:
      'E-mail não configurado no servidor: defina GMAIL_USER e GMAIL_APP_PASSWORD (senha de app de 16 letras, myaccount.google.com/apppasswords).',
  });
}

app.post('/api/tools/email/inbox', async (req: Request, res: Response) => {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return gmailEnvError(res);
  const limit = Math.min(Math.max(parseInt(String(req.body?.limit ?? '10'), 10) || 10, 1), 25);
  try {
    const { ImapFlow } = await import('imapflow');
    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      logger: false,
    });
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const total = (client.mailbox && typeof client.mailbox === 'object' ? client.mailbox.exists : 0) ?? 0;
      const start = Math.max(total - limit + 1, 1);
      const messages: Array<Record<string, unknown>> = [];
      for await (const msg of client.fetch(`${start}:*`, {
        envelope: true,
        flags: true,
        bodyStructure: true,
        headers: true,
        uid: true,
      })) {
        messages.push({
          uid: msg.uid,
          from: msg.envelope?.from?.[0]?.address ?? '',
          fromName: msg.envelope?.from?.[0]?.name ?? '',
          subject: msg.envelope?.subject ?? '(sem assunto)',
          date: msg.envelope?.date ?? null,
          seen: msg.flags?.has('\\Seen') ?? false,
        });
      }
      res.json({ success: true, totalInInbox: total, count: messages.length, messages: messages.reverse() });
    } finally {
      lock.release();
      try { await client.logout(); } catch { /* noop */ }
    }
  } catch (err) {
    res.status(502).json({ success: false, error: `IMAP Gmail: ${err instanceof Error ? err.message : String(err)}` });
  }
});

app.post('/api/tools/email/send', async (req: Request, res: Response) => {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return gmailEnvError(res);
  const { to, subject, body } = req.body as { to?: string; subject?: string; body?: string };
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    res.status(400).json({ success: false, error: 'Destinatário (to) inválido.' });
    return;
  }
  if (!subject?.trim() || !body?.trim()) {
    res.status(400).json({ success: false, error: 'Assunto e corpo são obrigatórios.' });
    return;
  }
  try {
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.default.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
    const info = await transport.sendMail({
      from: `\"JARVIS Nexus\" <${GMAIL_USER}>`,
      to,
      subject: subject.trim(),
      text: body,
    });
    res.json({ success: true, messageId: info.messageId, accepted: info.accepted });
  } catch (err) {
    res.status(502).json({ success: false, error: `SMTP Gmail: ${err instanceof Error ? err.message : String(err)}` });
  }
});

app.get('/api/tools/shell/validate', (req: Request, res: Response) => {
  const command = String(req.query.command || '');
  res.json(validateShellCommand(command));
});

// ===== Orquestração: planos executáveis com log e cancelamento =====
app.post('/api/orchestrate/start', aiRateLimitMiddleware, async (req: Request, res: Response) => {
  const { goal, autonomyLevel = 4 } = req.body as { goal?: string; autonomyLevel?: number };
  if (!goal) {
    res.status(400).json({ error: 'Objetivo não fornecido.' });
    return;
  }

  const plan = NexusOrchestrator.createPlan(String(goal), Number(autonomyLevel) as 1 | 2 | 3 | 4 | 5);
  res.json({ plan, started: true });

  // Execução assíncrona: o cliente acompanha via /api/orchestrate/status/:id
  void executePlan(plan, {
    autonomyLevel: Number(autonomyLevel) as 1 | 2 | 3 | 4 | 5,
    runTool: executeTool,
    store: planRuns,
  });
});

app.get('/api/orchestrate/status/:planId', (req: Request, res: Response) => {
  const state = planRuns.get(req.params.planId);
  if (!state) {
    res.status(404).json({ error: 'Execução não encontrada (expira em até 6h).' });
    return;
  }
  res.json({
    plan: state.plan,
    events: state.events.slice(-100),
    cancelled: state.cancelled,
    running: !state.finishedAt,
  });
});

app.post('/api/orchestrate/cancel/:planId', (req: Request, res: Response) => {
  const ok = planRuns.cancel(req.params.planId);
  res.json({ cancelled: ok });
});

app.post('/api/orchestrate', aiRateLimitMiddleware, async (req: Request, res: Response) => {
  const { goal, autonomyLevel = 4 } = req.body;

  if (!goal) {
    res.status(400).json({ error: 'Objetivo não fornecido.' });
    return;
  }

  // Decompose goal
  const plan = NexusOrchestrator.createPlan(String(goal), Number(autonomyLevel) as 1 | 2 | 3 | 4 | 5);

  // Resumo do plano via provedor escolhido (fallback automático para local)
  try {
    const summary = await chatWithFallback(
      {
        messages: [
          {
            role: 'user',
            content: `Você é o NEXUS ORCHESTRATOR do JARVIS. Objetivo do usuário: "${goal}". O plano tem ${plan.subtasks.length} subtarefas atribuídas a ${new Set(plan.subtasks.map(t => t.assignedAgentId)).size} agente(s). Retorne um resumo de 2 frases em português explicando como os agentes foram mobilizados.`,
          },
        ],
      },
      { providerId: (req.body as { providerId?: string }).providerId, model: (req.body as { model?: string }).model },
    );
    plan.finalResult = summary.text.trim();
  } catch {
    // Graceful fallback to local plan
  }

  res.json({ plan });
});

app.post('/api/mcp/dispatch', async (req: Request, res: Response) => {
  const { McpClient } = await import('./src/core/mcp/mcp-client.ts');
  const result = await McpClient.dispatchJsonRpc(req.body);
  res.json(result);
});

app.post('/api/chat', aiRateLimitMiddleware, async (req: Request, res: Response) => {
  const { message, agentId = 'nexus-orchestrator', history = [], providerId, model, memoryContext } = req.body as {
    message?: string;
    agentId?: string;
    history?: Array<{ role: string; content: string }>;
    providerId?: string;
    model?: string;
    memoryContext?: string;
  };

  if (!message) {
    res.status(400).json({ error: 'Mensagem vazia.' });
    return;
  }

  const agent = INITIAL_AGENTS.find(a => a.id === agentId) || INITIAL_AGENTS[0];
  const isResearch = agent.role === 'research' || /pesquisa|notícia|noticias|hoje|latest|busca|web|fonte|link|site/i.test(message);

  // Fontes REAIS: busca DuckDuckGo ao vivo antes de responder, quando o pedido
  // é de pesquisa. O modelo recebe os links e cita [1], [2]… e a UI exibe-os.
  let sources: Array<{ title: string; url: string; snippet?: string }> = [];
  if (isResearch) {
    try {
      const hits = await webSearch(String(message), 5);
      sources = hits.map(h => ({ title: h.title, url: h.url, snippet: h.snippet }));
    } catch {
      // sem rede: segue sem fontes, sem fingir
    }
  }

  const result = await chatWithFallback(
    {
      messages: [
        ...history.slice(-6).map((h) => ({
          role: (h.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: h.content,
        })),
        { role: 'user', content: String(message) },
      ],
      systemInstruction: `Você é ${agent.name} (${agent.title}), o cérebro do JARVIS NEXUS — Superagente autônomo open-source para celular.
Suas instruções específicas: ${agent.instructions}
Responda em português brasileiro de forma assertiva, moderna, profissional e sem enrolação. Quando apropriado, mencione ferramentas e agentes especializados mobilizados.${
        memoryContext ? `\n\nMEMÓRIA PERSISTENTE DO USUÁRIO (use como contexto contínuo):\n${memoryContext}` : ''
      }${
        sources.length
          ? `\n\nFONTES REAIS DA WEB (busca ao vivo DuckDuckGo). Cite-as no texto como [1], [2]… na ordem em que usar:\n${sources
              .map((src, i) => `[${i + 1}] ${src.title} — ${src.url}${src.snippet ? ` — ${src.snippet.slice(0, 200)}` : ''}`)
              .join('\n')}`
          : ''
      }`,
      useWebSearch: isResearch,
    },
    { providerId, model },
  );

  res.json({
    response: SecurityGuard.sanitizeOutput(result.text),
    reasoning: result.reasoning,
    sources,
    agentId: agent.id,
    agentName: agent.name,
    provider: `${result.providerId}:${result.model}`,
    local: result.local,
    fallbackReason: result.fallbackReason,
  });
});

// ===== Conectores (fluxo Base44: autorização no site oficial + validação real) =====
app.get('/api/connectors', (_req: Request, res: Response) => {
  res.json({ connectors: CONNECTOR_CATALOG });
});

app.post('/api/connectors/verify', async (req: Request, res: Response) => {
  const { connectorId, token, extra } = req.body as { connectorId?: string; token?: string; extra?: string };
  if (!connectorId || !token) {
    res.status(400).json({ ok: false, error: 'Conector e credencial são obrigatórios.' });
    return;
  }
  const result = await verifyConnectorCredentials(connectorId, token, extra);
  res.json(result);
});

// ===== Navegador ao vivo compartilhado =====
// Com BROWSERBASE_API_KEY/SECRET: cria sessão real na nuvem e devolve o
// link ao vivo (embed + compartilhável). Sem chaves: modo leitor honesto.
app.post('/api/browser/session', async (req: Request, res: Response) => {
  const { url: target } = req.body as { url?: string };
  if (!target || !/^https?:\/\//.test(String(target))) {
    res.status(400).json({ error: 'URL inválida.' });
    return;
  }
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const apiSecret = process.env.BROWSERBASE_API_SECRET;
  if (!apiKey || !apiSecret) {
    res.json({
      mode: 'reader',
      notice:
        'Sem chaves do Browserbase no servidor, o JARVIS abriu o modo leitor com o conteúdo REAL da página (navegador interativo ao vivo requer BROWSERBASE_API_KEY/SECRET).',
    });
    return;
  }
  try {
    const createRes = await fetch('https://www.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-BB-API-Key': apiKey },
      body: JSON.stringify({ projectId: process.env.BROWSERBASE_PROJECT_ID ?? undefined }),
    });
    if (!createRes.ok) {
      throw new Error(`Browserbase recusou a criação da sessão (HTTP ${createRes.status}).`);
    }
    const session = await createRes.json();
    const sessionId = session?.id;
    if (!sessionId) throw new Error('Browserbase não devolveu o id da sessão.');
    // Live View URL (co-browsing embed) — endpoint oficial /v1/sessions/{id}/live
    const liveRes = await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}/live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-BB-API-Key': apiKey },
      body: JSON.stringify({}),
    });
    const live = await liveRes.json().catch(() => null);
    const liveUrl = live?.liveViewURL ?? live?.liveUrl ?? live?.url;
    res.json({
      mode: 'live',
      sessionId: String(sessionId),
      liveUrl,
      target,
      notice: liveUrl
        ? undefined
        : 'Sessão criada, mas o link ao vivo não foi devolvido. Configure o projeto Browserbase.',
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Modo leitor do navegador: conteúdo real da página em texto.
app.post('/api/tools/web-fetch', async (req: Request, res: Response) => {
  const { url } = req.body as { url?: string };
  try {
    const page = await webFetch(String(url || ''));
    res.json({ url: page.url, title: page.title, text: page.text, truncated: page.truncated });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Vite Middleware mounting
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[JARVIS NEXUS] Server running on port ${PORT}`);
  });
}

startServer();

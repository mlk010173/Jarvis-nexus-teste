import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { CURATED_REPOSITORIES, executeTool } from './src/core/tools/tools-registry.ts';
import { NexusOrchestrator } from './src/core/orchestrator/orchestrator.ts';
import { INITIAL_AGENTS } from './src/core/orchestrator/agents-registry.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { SimpleRateLimiter } from './src/core/security/rate-limiter.ts';

const app = express();
const PORT = 3000;

app.use(express.json());

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

// Initialize Gemini SDK with telemetry header
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// REST Endpoints
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(geminiApiKey),
    model: 'gemini-3.8-flash',
    defaultProvider: geminiApiKey ? 'Google Gemini 3.8 Flash' : 'JARVIS Local Heuristic Engine (Offline-Ready)',
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

app.post('/api/orchestrate', aiRateLimitMiddleware, async (req: Request, res: Response) => {
  const { goal, autonomyLevel = 4 } = req.body;

  if (!goal) {
    res.status(400).json({ error: 'Objetivo não fornecido.' });
    return;
  }

  // Decompose goal
  const plan = NexusOrchestrator.createPlan(String(goal), Number(autonomyLevel) as 1 | 2 | 3 | 4 | 5);

  // If Gemini is available, enhance subtasks instructions
  if (ai && geminiApiKey) {
    try {
      const prompt = `Você é o NEXUS ORCHESTRATOR do JARVIS.
Objetivo do usuário: "${goal}".
Retorne um resumo de 2 frases em português explicando como os agentes (Código, UI/UX, Pesquisa, Deploy) foram mobilizados para atender essa meta.`;

      const geminiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      if (geminiResponse.text) {
        plan.finalResult = geminiResponse.text.trim();
      }
    } catch {
      // Graceful fallback to local plan
    }
  }

  res.json({ plan });
});

app.post('/api/mcp/dispatch', async (req: Request, res: Response) => {
  const { McpClient } = await import('./src/core/mcp/mcp-client.ts');
  const result = await McpClient.dispatchJsonRpc(req.body);
  res.json(result);
});

app.post('/api/chat', aiRateLimitMiddleware, async (req: Request, res: Response) => {
  const { message, agentId = 'nexus-orchestrator', history = [] } = req.body;

  if (!message) {
    res.status(400).json({ error: 'Mensagem vazia.' });
    return;
  }

  const agent = INITIAL_AGENTS.find(a => a.id === agentId) || INITIAL_AGENTS[0];

  // Try Gemini with Search Grounding if available
  if (ai && geminiApiKey) {
    try {
      const systemInstruction = `Você é ${agent.name} (${agent.title}), o cérebro do JARVIS NEXUS — Superagente autônomo open-source para celular.
Suas instruções específicas: ${agent.instructions}
Responda em português brasileiro de forma assertiva, moderna, profissional e sem enrolação. Quando apropriado, mencione ferramentas e agentes especializados mobilizados.`;

      // Build conversation contents
      const conversationContents = [
        ...history.slice(-6).map((h: { role: string; content: string }) => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }],
        })),
        {
          role: 'user',
          parts: [{ text: String(message) }],
        },
      ];

      // Use Gemini 3.8 Flash with Google Search Grounding for live web queries
      const isResearch = agent.role === 'research' || /pesquisa|notícia|hoje|latest|busca|web/i.test(message);

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: conversationContents as any,
        config: {
          systemInstruction,
          tools: isResearch ? [{ googleSearch: {} }] : undefined,
        },
      });

      res.json({
        response: response.text || 'Processamento concluído com sucesso.',
        agentId: agent.id,
        agentName: agent.name,
        provider: 'gemini-3.8-flash',
        grounded: isResearch,
      });
      return;
    } catch {
      // Fallback below
    }
  }

  // Local Intelligent Heuristic Response (Offline-Ready)
  const lowerMsg = String(message).toLowerCase();
  let text = '';

  if (lowerMsg.includes('olá') || lowerMsg.includes('oi') || lowerMsg.includes('jarvis')) {
    text = `Olá! Eu sou o JARVIS NEXUS, seu superagente autônomo no celular. Posso coordenar até 12 agentes especializados, buscar em repositórios open-source (Magic UI, Shadcn, Tailwind, Flutter), criar planos e executar deploys. O que você quer construir hoje?`;
  } else if (lowerMsg.includes('app') || lowerMsg.includes('tarefa') || lowerMsg.includes('todo') || lowerMsg.includes('projeto')) {
    text = `Perfeito! Vou acionar os agentes especializados:
1. Agente de Código -> vai buscar repositórios open-source e modelos base (ex: Magic UI / Tailwind).
2. Agente de UI/UX -> vai criar uma interface moderna e ergonômica para smartphone Android.
3. Agente de Deploy -> vai configurar o ambiente para rodar no seu celular via Termux ou PWA.
Abri um plano de execução detalhado na aba "Projetos".`;
  } else if (lowerMsg.includes('agente') || lowerMsg.includes('equipe')) {
    text = `O JARVIS NEXUS conta com 12 agentes especializados ativos: Superagente Orchestrator, Código, Pesquisa, UI/UX, Deploy, Autônomo, Memória, Dados, Automação, Voz, Segurança e Qualidade. Você pode inspecioná-los ou criar novos agentes na aba "Agentes".`;
  } else {
    text = `Comando recebido pelo ${agent.name}. Analisando requisitos e executando dentro das políticas de segurança e permissões configuradas.`;
  }

  res.json({
    response: text,
    agentId: agent.id,
    agentName: agent.name,
    provider: 'local_heuristic_engine',
  });
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

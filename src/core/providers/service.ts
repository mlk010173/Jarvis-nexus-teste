/**
 * JARVIS NEXUS — Serviço unificado de LLM (server-side)
 *
 * Resolve o provedor a partir de {providerId, model} enviados pelo cliente
 * e usa SOMENTE chaves presentes no ambiente do servidor (process.env).
 * O cliente jamais envia ou recebe chaves.
 */

import type { ChatRequest, ChatResponse, LLMProvider } from './types.ts';
import { findProviderCatalogEntry, PROVIDER_CATALOG } from './registry.ts';

/** fetch com timeout e uma tentativa de retry (rede instável). */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 30_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Heurística local: reutilizada pelo chat offline e como fallback final. */
export function heuristicChat(request: ChatRequest): string {
  const last = request.messages[request.messages.length - 1]?.content ?? '';
  const lower = last.toLowerCase();
  if (lower.includes('olá') || lower.includes('oi') || lower.includes('jarvis')) {
    return `Olá! Sou o JARVIS NEXUS em modo offline (Heuristic Engine). Posso planejar metas, gerenciar agentes, memória e ferramentas locais. Para respostas com IA na nuvem, configure um provedor na aba Provedores.`;
  }
  if (lower.includes('app') || lower.includes('projeto') || lower.includes('lista')) {
    return `Plano local registrado. Vou decompor a meta em subtarefas (Pesquisa → Código → UI/UX → Deploy) na aba Projetos. Sem provedor de IA configurado, a execução usa heurísticas locais.`;
  }
  return `Comando processado localmente pelo Heuristic Engine. Configure um provedor (Gemini, OpenRouter, Groq, NVIDIA NIM ou Ollama local) para respostas com LLM na nuvem.`;
}

/** Extrai e limpa a linha de raciocínio devolvida por modelos thinking (Kimi, DeepSeek, Grok reasoning). */
export function extractReasoning(raw: string): string | undefined {
  const trimmed = (raw ?? '').trim();
  return trimmed ? trimmed : undefined;
}

class GeminiProvider implements LLMProvider {
  readonly id = 'gemini';
  readonly kind = 'gemini' as const;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({
      apiKey: this.apiKey,
      httpOptions: { headers: { 'User-Agent': 'jarvis-nexus' } },
    });

    const history = request.messages.slice(0, -1).map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: this.model,
      contents: [...history, { role: 'user', parts: [{ text: request.messages[request.messages.length - 1].content }] }],
      config: {
        systemInstruction: request.systemInstruction,
        tools: request.useWebSearch ? [{ googleSearch: {} }] : undefined,
      },
    });

    return {
      text: response.text ?? '',
      providerId: this.id,
      model: this.model,
      local: false,
    };
  }
}

class OpenAICompatibleProvider implements LLMProvider {
  readonly id: string;
  readonly kind = 'openai-compatible' as const;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey: string | undefined;

  constructor(id: string, baseUrl: string, model: string, apiKey?: string) {
    this.id = id;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
    this.apiKey = apiKey;
  }

  isAvailable(): boolean {
    return Boolean(this.baseUrl);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const messages = [
      ...(request.systemInstruction ? [{ role: 'system', content: request.systemInstruction }] : []),
      ...request.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: this.model, messages, temperature: 0.7 }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Provedor ${this.id} respondeu ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string; reasoning_content?: string; reasoning?: string } }>;
    };
    const rawMessage = data.choices?.[0]?.message;
    return {
      text: rawMessage?.content ?? '',
      reasoning: extractReasoning(rawMessage?.reasoning_content ?? rawMessage?.reasoning ?? ''),
      providerId: this.id,
      model: this.model,
      local: false,
    };
  }
}

/**
 * Conector Base44 Superagent: o JARVIS vira interface remota de um
 * Superagent real (memória persistente, ferramentas e conectores do
 * agente dono). Autenticação por Bearer token, conforme API pública.
 */
class Base44SuperagentProvider implements LLMProvider {
  readonly id = 'base44-superagent';
  readonly kind = 'openai-compatible' as const;
  private readonly apiKey: string;
  private readonly agentId: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, agentId: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.agentId = agentId;
    this.baseUrl = baseUrl;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.agentId);
  }

  /** Resolve (ou cria) a conversa padrão do agente e devolve o id do thread. */
  private async getDefaultConversationId(): Promise<string> {
    // POST cria ou devolve a conversa padrão do agente (API pública Base44).
    const res = await fetchWithTimeout(`${this.baseUrl}/api/agents/${this.agentId}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error(`Base44 respondeu ${res.status} ao resolver a conversa padrão.`);
    const data = await res.json();
    const id = data?.id ?? data?.conversation?.id ?? (Array.isArray(data) ? data[0]?.id : undefined);
    if (!id) throw new Error('Não foi possível resolver a conversa padrão do agente Base44.');
    return String(id);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const conversationId = await this.getDefaultConversationId();
    const last = request.messages[request.messages.length - 1]?.content ?? '';
    const res = await fetchWithTimeout(
      `${this.baseUrl}/api/agents/${this.agentId}/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ content: last }),
      },
      120_000,
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Base44 respondeu ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data?.content ?? data?.message?.content ?? data?.text ?? '';
    return {
      text: typeof text === 'string' ? text : JSON.stringify(text),
      providerId: this.id,
      model: 'superagent',
      local: false,
    };
  }
}

class HeuristicProvider implements LLMProvider {
  readonly id = 'local-heuristic';
  readonly kind = 'heuristic' as const;

  isAvailable(): boolean {
    return true;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    return {
      text: heuristicChat(request),
      providerId: this.id,
      model: 'heuristic-v1',
      local: true,
    };
  }
}

export interface ResolveOptions {
  providerId?: string;
  model?: string;
}

/** Resolve um LLMProvider a partir da escolha do cliente + ambiente do servidor. */
export function resolveProvider(opts: ResolveOptions): LLMProvider {
  const entry = findProviderCatalogEntry(opts.providerId ?? 'local-heuristic');
  if (!entry) return new HeuristicProvider();

  const model = opts.model && entry.models.includes(opts.model) ? opts.model : entry.defaultModel;

  if (entry.kind === 'gemini') {
    const key = process.env.GEMINI_API_KEY;
    return key ? new GeminiProvider(key, model) : new HeuristicProvider();
  }

  if (entry.id === 'base44-superagent') {
    const apiKey = process.env.BASE44_API_KEY;
    const agentId = process.env.BASE44_AGENT_ID;
    const baseUrl = (process.env.BASE44_API_BASE ?? 'https://app.base44.com').replace(/\/$/, '');
    return apiKey && agentId ? new Base44SuperagentProvider(apiKey, agentId, baseUrl) : new HeuristicProvider();
  }

  if (entry.kind === 'openai-compatible') {
    const apiKey =
      entry.id === 'ollama'
        ? undefined // Ollama local normalmente não exige chave
        : process.env[entry.envKey ?? ''];
    const baseUrl = entry.baseUrl ?? '';
    return new OpenAICompatibleProvider(entry.id, baseUrl, model, apiKey);
  }

  return new HeuristicProvider();
}

/**
 * Lista provedores para a UI: nunca expõe valores de chaves,
 * apenas se o provedor está habilitado no servidor.
 */
export function listProviderStatus() {
  return PROVIDER_CATALOG.map((p) => {
    let enabled = p.kind === 'heuristic';
    if (p.envKey) enabled = Boolean(process.env[p.envKey]);
    if (p.id === 'ollama') enabled = Boolean(process.env.OLLAMA_BASE_URL ?? true);
    if (p.id === 'base44-superagent')
      enabled = Boolean(process.env.BASE44_API_KEY && process.env.BASE44_AGENT_ID);
    return {
      id: p.id,
      name: p.name,
      kind: p.kind,
      description: p.description,
      isLocal: p.isLocal,
      defaultModel: p.defaultModel,
      models: p.models,
      costNotes: p.costNotes,
      docsUrl: p.docsUrl,
      enabled,
    };
  });
}

/**
 * Chat com fallback em cascata: provedor escolhido → gemini (se configurado) → heurística.
 * Sempre devolve uma resposta útil e reporta o motivo do fallback.
 */
export async function chatWithFallback(
  request: ChatRequest,
  opts: ResolveOptions,
): Promise<ChatResponse> {
  const primary = resolveProvider(opts);
  try {
    if (!primary.isAvailable()) throw new Error('Provedor selecionado não está habilitado no servidor.');
    const result = await primary.chat(request);
    if (result.text.trim()) return result;
    throw new Error('Resposta vazia do provedor.');
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    const geminiEntry = findProviderCatalogEntry('gemini');
    const geminiKey = process.env.GEMINI_API_KEY;
    if (opts.providerId !== 'gemini' && geminiEntry && geminiKey) {
      try {
        const fallback = await new GeminiProvider(geminiKey, geminiEntry.defaultModel).chat(request);
        return { ...fallback, fallbackReason: `${primary.id} falhou: ${reason}. Respondido pelo Gemini.` };
      } catch {
        // cai para heurística
      }
    }
    const local = await new HeuristicProvider().chat(request);
    return { ...local, fallbackReason: `${primary.id} indisponível: ${reason}. Respondido offline.` };
  }
}

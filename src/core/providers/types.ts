/**
 * JARVIS NEXUS — Contrato de Provedores de IA
 *
 * Contrato de portabilidade: qualquer backend (Base44, Express próprio,
 * FastAPI, etc.) que implemente `LLMProvider` pode alimentar a interface
 * sem reescrever nenhuma view. Nenhuma implementação aqui conhece a UI,
 * e nenhuma view conhece detalhes de rede/auth dos provedores.
 */

export type ProviderKind = 'gemini' | 'openai-compatible' | 'heuristic';

export interface ChatMessageInput {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessageInput[];
  systemInstruction?: string;
  /** Se true, provedores de nuvem podem usar ferramentas de busca nativas. */
  useWebSearch?: boolean;
}

export interface ChatResponse {
  text: string;
  providerId: string;
  model: string;
  /** true se a resposta veio de um motor local (sem rede). */
  local: boolean;
  /** Motivo do fallback, quando aplicável. */
  fallbackReason?: string;
}

/**
 * Contrato que todo provedor de IA do JARVIS NEXUS implementa.
 * Implementações ficam no servidor; o cliente só envia providerId + model.
 */
export interface LLMProvider {
  readonly id: string;
  readonly kind: ProviderKind;
  /** Verifica (sem expor segredos) se o provedor está pronto para uso. */
  isAvailable(): boolean;
  chat(request: ChatRequest): Promise<ChatResponse>;
}

export interface ProviderCatalogEntry {
  id: string;
  name: string;
  kind: ProviderKind;
  description: string;
  isLocal: boolean;
  /** Nome da variável de ambiente que habilita o provedor (sem expor o valor). */
  envKey?: string;
  /** Compatível com o endpoint OpenAI /v1/chat/completions. */
  baseUrl?: string;
  defaultModel: string;
  models: string[];
  /** Notas honestas de custo/limite — exibidas na UI sem maquiagem. */
  costNotes: string;
  docsUrl?: string;
}

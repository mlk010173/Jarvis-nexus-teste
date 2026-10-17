/**
 * JARVIS NEXUS — Catálogo de Provedores de IA
 *
 * Custos e limites declarados com honestidade (regra: nunca afirmar que
 * algo é "100% grátis" sem verificar). As chaves NUNCA ficam no frontend:
 * cada provedor é habilitado por variável de ambiente no servidor.
 */

import type { ProviderCatalogEntry } from './types.ts';

export const PROVIDER_CATALOG: ProviderCatalogEntry[] = [
  {
    id: 'gemini',
    name: 'Google Gemini 3.8 Flash',
    kind: 'gemini',
    description:
      'SDK oficial @google/genai com Google Search Grounding em perguntas sobre novidades na web.',
    isLocal: false,
    envKey: 'GEMINI_API_KEY',
    defaultModel: 'gemini-3.8-flash',
    models: ['gemini-3.8-flash', 'gemini-3.5-flash-lite'],
    costNotes:
      'Tem camada gratuita com limites de requisições por minuto/dia; uso acima do limite é pago (faturamento por token no Google AI Studio).',
    docsUrl: 'https://aistudio.google.com',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (modelos :free e pagos)',
    kind: 'openai-compatible',
    description:
      'Gateway agregador com dezenas de modelos. Modelos com sufixo :free têm camada gratuita.',
    isLocal: false,
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-4-scout:free',
    models: [
      'meta-llama/llama-4-scout:free',
      'deepseek/deepseek-chat-v3:free',
      'qwen/qwen3-coder:free',
    ],
    costNotes:
      'Modelos :free são gratuitos mas têm limite diário de requisições e podem ter fila; modelos pagos são cobrados por token.',
    docsUrl: 'https://openrouter.ai/docs',
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    kind: 'openai-compatible',
    description: 'Inferência ultrarrápida (LPU) com camada gratuita generosa.',
    isLocal: false,
    envKey: 'GROQ_API_KEY',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'gemma2-9b-it'],
    costNotes:
      'Camada gratuita com limite de tokens por minuto/dia; acima disso é preciso de plano pago.',
    docsUrl: 'https://console.groq.com',
  },
  {
    id: 'nvidia-nim',
    name: 'NVIDIA NIM (build.nvidia.com)',
    kind: 'openai-compatible',
    description: 'Modelos abertos (Nemotron, DeepSeek, Llama) hospedados pela NVIDIA.',
    isLocal: false,
    envKey: 'NVIDIA_NIM_API_KEY',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',
    models: [
      'nvidia/llama-3.3-nemotron-super-49b-v1.5',
      'deepseek-ai/deepseek-r1',
    ],
    costNotes:
      'Créditos iniciais gratuitos para desenvolvedores (limitados); consumo contínuo é pago.',
    docsUrl: 'https://build.nvidia.com',
  },
  {
    id: 'ollama',
    name: 'Ollama (local / LAN)',
    kind: 'openai-compatible',
    description:
      'Modelos abertos rodando na sua máquina, celular (Termux) ou servidor da rede. Sem nuvem.',
    isLocal: true,
    envKey: 'OLLAMA_BASE_URL',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    models: ['llama3.2', 'qwen2.5-coder:7b', 'phi4-mini'],
    costNotes:
      'Gratuito e sem cota de API; custo real é o hardware (CPU/GPU do aparelho que hospeda o Ollama).',
    docsUrl: 'https://ollama.com',
  },
  {
    id: 'local-heuristic',
    name: 'JARVIS Heuristic Engine (offline)',
    kind: 'heuristic',
    description:
      'Motor local baseado em regras, sempre disponível mesmo sem rede ou chave de API.',
    isLocal: true,
    defaultModel: 'heuristic-v1',
    models: ['heuristic-v1'],
    costNotes: 'Gratuito, roda 100% no servidor/aparelho, sem dependência externa.',
  },
];

export function findProviderCatalogEntry(id: string): ProviderCatalogEntry | undefined {
  return PROVIDER_CATALOG.find((p) => p.id === id);
}

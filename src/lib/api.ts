/**
 * JARVIS NEXUS — Camada de API com servidor ONLINE ao vivo
 *
 * O app funciona em dois modos:
 * 1. Local (dev): o mesmo servidor Express entrega frontend + API (base vazia).
 * 2. Online: o frontend (GitHub Pages ou qualquer host) aponta para o
 *    servidor ao vivo configurado aqui (ex.: https://jarvis-nexus.onrender.com).
 *
 * O endereço fica no aparelho do usuário (localStorage) e pode ser trocado
 * na tela de Configurações a qualquer momento, sem rebuild.
 */

const API_BASE_KEY = 'jarvis_nexus_api_base';

export function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  try {
    return (localStorage.getItem(API_BASE_KEY) ?? '').trim().replace(/\/$/, '');
  } catch {
    return '';
  }
}

export function setApiBase(url: string): string {
  const clean = url.trim().replace(/\/$/, '');
  if (typeof window === 'undefined') return clean;
  try {
    if (clean) localStorage.setItem(API_BASE_KEY, clean);
    else localStorage.removeItem(API_BASE_KEY);
  } catch {
    // modo privado: segue com valor em memória da sessão
  }
  return clean;
}

export interface HealthResult {
  online: boolean;
  latencyMs?: number;
  providers?: Array<{ id: string; name: string; enabled: boolean }>;
  error?: string;
}

/** Ping real de /api/health no servidor ao vivo (mede latência de verdade). */
export async function checkServerHealth(base = getApiBase()): Promise<HealthResult> {
  const started = Date.now();
  try {
    const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    return { online: res.ok, latencyMs: Date.now() - started, providers: data?.providers };
  } catch (err) {
    return { online: false, error: err instanceof Error ? err.message : 'Servidor inacessível' };
  }
}

/**
 * JARVIS NEXUS — Ponte com o backend JARVIS (function jarvisApi)
 *
 * O backend do site JARVIS é uma function Base44 hospedada na nuvem de um
 * Superagent do próprio usuário. Esta ponte envia o envelope padrão
 * { rota, metodo, corpo, token } com a chave de API guardada no ambiente
 * (JARVIS_API_KEY) e a URL base (JARVIS_BACKEND_URL).
 *
 * Requer no ambiente:
 *   JARVIS_API_KEY     — chave de API do Superagent dono da function
 *   JARVIS_BACKEND_URL — ex: https://superagent-XXXX.base44.app/functions/jarvisApi
 */

export interface JarvisBridgeArgs {
  rota: string;
  metodo?: string;
  corpo?: unknown;
  token?: string | null;
}

export function isJarvisBridgeConfigured(): boolean {
  return Boolean(process.env.JARVIS_API_KEY && process.env.JARVIS_BACKEND_URL);
}

export async function callJarvisBackend(args: JarvisBridgeArgs): Promise<unknown> {
  const key = process.env.JARVIS_API_KEY;
  const base = process.env.JARVIS_BACKEND_URL;
  if (!key || !base) {
    throw new Error('Ponte JARVIS não configurada: defina JARVIS_API_KEY e JARVIS_BACKEND_URL no ambiente.');
  }
  if (!/^\/api\//.test(String(args.rota || ''))) {
    throw new Error('Rota inválida: use rotas /api/... do backend JARVIS.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(base, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        rota: String(args.rota),
        metodo: String(args.metodo || 'GET').toUpperCase(),
        corpo: args.corpo ?? {},
        token: args.token ?? null,
      }),
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = { erro: `Resposta inválida da ponte JARVIS (HTTP ${res.status}).` };
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

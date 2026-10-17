/**
 * Webhooks genéricos: qualquer serviço externo acorda o JARVIS.
 *
 * POST /api/webhooks/:hookId  (header opcional x-hook-secret quando o hook
 * foi criado com secret). O corpo do evento vira CONTEXTO DO GATILHO e a
 * mensagem (campo `message` do corpo ou default) roda no pipeline de wake.
 */

export interface HookInfo {
  id: string;
  secret?: string;
  createdAt: number;
  hits: number;
  lastHitAt?: number;
  lastSource?: string;
}

const hooks = new Map<string, HookInfo>();

export function registerHook(id: string, secret?: string): HookInfo {
  const existing = hooks.get(id);
  if (existing) {
    existing.secret = secret ?? existing.secret;
    return existing;
  }
  const hook: HookInfo = { id, secret, createdAt: Date.now(), hits: 0 };
  hooks.set(id, hook);
  return hook;
}

export function listHooks(): HookInfo[] {
  return [...hooks.values()].map((h) => ({ ...h, secret: h.secret ? '***' : undefined }));
}

export function checkHookSecret(id: string, provided: string | undefined): { ok: boolean; hook?: HookInfo } {
  const hook = hooks.get(id);
  if (!hook) return { ok: false };
  if (hook.secret) {
    if (!provided || provided !== hook.secret) return { ok: false };
  }
  hook.hits += 1;
  hook.lastHitAt = Date.now();
  return { ok: true, hook };
}

/** Mensagem a partir do corpo do evento: campo message explícito ou default. */
export function messageFromBody(id: string, body: Record<string, unknown>): string {
  const m = body['message'];
  if (typeof m === 'string' && m.trim()) return m.trim();
  return `Webhook ${id} disparou. Analise o CONTEXTO DO GATILHO e aja conforme a instrução do evento (ou apenas registre se não houver ação clara).`;
}

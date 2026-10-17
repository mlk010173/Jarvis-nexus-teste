/**
 * Canal WhatsApp — API Oficial Cloud (Meta) + validação de webhook.
 *
 * Envio (free tier da Meta): precisa de WHATSAPP_TOKEN + WHATSAPP_PHONE_ID.
 * Recebimento: webhook GET (verificação Meta) e POST (mensagens) que acordam
 * o agente via pipeline de wake. Alternativa 100% local sem Meta: bridge
 * whatsapp-web.js em bridges/whatsapp-web/ (QR no seu celular, uma vez só).
 */

/** Normaliza qualquer formato de telefone BR para E.164 sem '+' (só dígitos). */
export function normalizeWhatsapp(raw: string): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  return digits.replace(/^0+(?=.)/, '');
}

/** Verificação do webhook da Meta (GET com hub_* query params). */
export function verifyMetaWebhook(query: Record<string, unknown>): string | null {
  const mode = String(query['hub.mode'] ?? '');
  const token = String(query['hub.verify_token'] ?? '');
  const challenge = String(query['hub.challenge'] ?? '');
  const expected = process.env.META_VERIFY_TOKEN ?? 'jarvis-nexus';
  if (mode === 'subscribe' && token && token === expected && challenge) {
    return challenge;
  }
  return null;
}

export interface IncomingMessage {
  from: string;
  text: string;
  msgId: string;
  timestamp?: number;
}

/** Extrai mensagens de texto de um payload do webhook Meta. */
export function parseIncomingWhatsApp(payload: Record<string, unknown>): IncomingMessage[] {
  const out: IncomingMessage[] = [];
  for (const entry of (payload['entry'] ?? []) as Array<Record<string, unknown>>) {
    for (const change of (entry['changes'] ?? []) as Array<Record<string, unknown>>) {
      const value = (change['value'] ?? {}) as Record<string, unknown>;
      for (const msg of (value['messages'] ?? []) as Array<Record<string, unknown>>) {
        const text = ((msg['text'] ?? {}) as Record<string, unknown>)['body'];
        if (typeof text === 'string' && text.trim()) {
          out.push({
            from: String(msg['from'] ?? ''),
            text: text.trim(),
            msgId: String(msg['id'] ?? ''),
            timestamp: typeof msg['timestamp'] === 'string' ? Number(msg['timestamp']) : undefined,
          });
        }
      }
    }
  }
  return out;
}

/** Envio real via Graph API. Sem chaves configuradas, erro honesto. */
export async function sendWhatsAppText(to: string, text: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  const token = process.env.WHATSAPP_TOKEN ?? '';
  const phoneId = process.env.WHATSAPP_PHONE_ID ?? '';
  if (!token || !phoneId) {
    return { ok: false, error: 'WhatsApp Cloud API não configurado: defina WHATSAPP_TOKEN e WHATSAPP_PHONE_ID (ou use a bridge local bridges/whatsapp-web).' };
  }
  if (!to || !/^\d{8,17}$/.test(to.replace(/\D/g, ''))) {
    return { ok: false, error: 'Destinatário inválido (use formato E.164 sem +, ex: 5527998518705).' };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''),
        type: 'text',
        text: { body: text.slice(0, 4000) },
      }),
    });
    return { ok: res.ok, status: res.status, error: res.ok ? undefined : (await res.text()).slice(0, 300) };
  } catch (err) {
    return { ok: false, error: `Falha de rede: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** Número de destino padrão: o dono (OWNER_WHATSAPP, lido na hora). */
export function defaultRecipient(requested?: string): string {
  if (requested && /\d/.test(requested)) return normalizeWhatsapp(requested);
  return normalizeWhatsapp(process.env.OWNER_WHATSAPP ?? '');
}

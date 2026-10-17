/**
 * Wake: automações externas (n8n, cron, webhooks de canal, outro agente)
 * acordam o JARVIS NEXUS com uma mensagem operacional — equivalente ao
 * /wake do blueprint Superagent (docs/blueprint-superagent-integracao-profunda.md, 1.13).
 *
 * Padrões:
 * - message: instrução operacional ("leia os e-mails novos e envie o código ao dono")
 * - source: origem do gatilho ("n8n", "cron", "gmail-github-watch", "whatsapp")
 * - context: dados do gatilho (IDs de mensagem, chat_id, payload)
 * - Guarda opcional: WAKE_TOKEN no ambiente -> header x-wake-token obrigatório
 */

export interface WakePayload {
  message: string;
  source?: string;
  context?: Record<string, unknown>;
}

/** Compõe a mensagem final entregue ao agente a partir do payload do gatilho. */
export function composeWakeMessage(payload: WakePayload): string {
  const { message, context } = payload;
  const trimmed = (message ?? '').trim();
  if (!trimmed) {
    throw new Error('Wake sem mensagem.');
  }
  if (!context || Object.keys(context).length === 0) {
    return trimmed;
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(context, null, 2);
  } catch {
    serialized = String(context);
  }
  // Trunca contexto gigantesco para não estourar o orçamento de tokens do turno.
  if (serialized.length > 4000) {
    serialized = `${serialized.slice(0, 4000)}\n…(contexto truncado)`;
  }
  return `${trimmed}\n\nCONTEXTO DO GATILHO:\n${serialized}`;
}

/** Guarda de token: se WAKE_TOKEN não está configurado, aceita (modo dev);
 *  se está, exige match exato. Nunca loga o token. */
export function shouldWakePass(provided: string | undefined, expected: string | undefined): boolean {
  if (!expected) {
    return true;
  }
  return typeof provided === 'string' && provided.length > 0 && provided === expected;
}

/** Instrução de sistema para turnos de wake (sem conversa prévia). */
export const WAKE_SYSTEM_INSTRUCTION = `Você é o NEXUS ORCHESTRATOR do JARVIS NEXUS, acordado por uma automação externa (não é o dono falando no chat).
Executa a instrução operacional com as ferramentas disponíveis e responde de forma curta e estruturada:
1) o que foi feito, 2) o resultado verificado, 3) o que ficou pendente.
Se a instrução exigir ação destrutiva ou contato a novo destinatário sem autorização, responda apenas o bloqueio e o motivo — não execute.`;

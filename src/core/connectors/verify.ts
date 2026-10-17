/**
 * JARVIS NEXUS — Verificação REAL de credenciais de conectores (server-side)
 *
 * Nunca grava nada: recebe {connectorId, token, extra}, chama a API pública
 * oficial do serviço e devolve apenas dados públicos (login, email, nome do
 * bot). Se a credencial for inválida, o erro do próprio provedor sobe.
 */

import { findConnector } from './connectors-registry.ts';

export interface VerifyResult {
  ok: boolean;
  /** Identidade pública devolvida pelo serviço (ex.: login do GitHub). */
  identity?: string;
  /** Detalhe útil devolvido pelo serviço (nº de modelos, contagem de e-mails…). */
  detail?: string;
  error?: string;
}

async function jsonFetch(url: string, headers: Record<string, string>, timeoutMs = 12_000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    return { res, data, text };
  } finally {
    clearTimeout(timer);
  }
}

export async function verifyConnectorCredentials(
  connectorId: string,
  token: string,
  extra?: string,
): Promise<VerifyResult> {
  const spec = findConnector(connectorId);
  if (!spec) return { ok: false, error: 'Conector desconhecido.' };
  if (!token?.trim()) return { ok: false, error: 'Credencial vazia.' };

  const bearer = { Authorization: `Bearer ${token.trim()}` };

  try {
    switch (spec.verify.kind) {
      case 'bearer-user': {
        const { res, data } = await jsonFetch(`${spec.verify.baseUrl}/user`, bearer);
        if (!res.ok) return { ok: false, error: `Serviço respondeu ${res.status}. Verifique o token.` };
        return { ok: true, identity: data?.login ?? data?.name, detail: data?.type ? `tipo: ${data.type}` : undefined };
      }
      case 'models-list': {
        const { res, data } = await jsonFetch(`${spec.verify.baseUrl}/models`, bearer);
        if (!res.ok) return { ok: false, error: `Serviço respondeu ${res.status}. Chave inválida ou sem permissão.` };
        const count = Array.isArray(data?.data) ? data.data.length : 0;
        return { ok: true, identity: 'chave válida', detail: `${count} modelos disponíveis` };
      }
      case 'telegram-getme': {
        const { res, data } = await jsonFetch(`${spec.verify.baseUrl}/bot${token.trim()}/getMe`, {});
        if (!res.ok || data?.ok !== true) return { ok: false, error: 'Telegram rejeitou o token (getMe falhou).' };
        return { ok: true, identity: `@${data.result.username}`, detail: data.result.first_name };
      }
      case 'gmail-imap': {
        // Login IMAP real via imapflow (só existe no servidor).
        const user = (extra || '').trim() || process.env.GMAIL_USER || '';
        if (!user) return { ok: false, error: 'Informe o e-mail da conta Gmail (campo extra ou GMAIL_USER no servidor).' };
        if (!token || token.replace(/\s/g, '').length !== 16) {
          return { ok: false, error: 'Senha de app do Gmail deve ter 16 letras (myaccount.google.com/apppasswords).' };
        }
        try {
          const { ImapFlow } = await import('imapflow');
          const client = new ImapFlow({
            host: 'imap.gmail.com',
            port: 993,
            secure: true,
            auth: { user, pass: token.replace(/\s/g, '') },
            logger: false,
          });
          await client.connect();
          const lock = await client.getMailboxLock('INBOX');
          const total = (client.mailbox && typeof client.mailbox === 'object' ? client.mailbox.exists : 0) ?? 0;
          lock.release();
          await client.logout();
          return { ok: true, identity: user, detail: `Login IMAP OK — caixa de entrada com ${total} mensagens.` };
        } catch (err) {
          return { ok: false, error: `IMAP Gmail: ${err instanceof Error ? err.message : String(err)}` };
        }
      }
      case 'gmail-profile': {
        const { res, data } = await jsonFetch(`${spec.verify.baseUrl}/users/me/profile`, bearer);
        if (!res.ok) return { ok: false, error: `Gmail respondeu ${res.status}. Token OAuth inválido/expirado.` };
        return { ok: true, identity: data?.emailAddress, detail: `${data?.messagesTotal ?? '?'} mensagens na caixa` };
      }
      case 'base44-agent': {
        if (!extra?.trim()) return { ok: false, error: 'Informe o id do agente Base44.' };
        const { res, data } = await jsonFetch(
          `${spec.verify.baseUrl.replace(/\/$/, '')}/api/agents/${extra.trim()}/conversations`,
          { api_key: token.trim() },
        );
        if (!res.ok) return { ok: false, error: `Base44 respondeu ${res.status}. Confira API key e id do agente.` };
        const id = data?.id ?? data?.conversation?.id;
        return { ok: true, identity: id ? `conversa ${String(id).slice(0, 8)}…` : 'agente acessível', detail: 'API do superagente respondeu' };
      }
      case 'ollama-tags': {
        const { res, data } = await jsonFetch(`${token.trim().replace(/\/$/, '')}/api/tags`, {});
        if (!res.ok) return { ok: false, error: `Ollama não respondeu (${res.status}). O servidor está rodando?` };
        const models = Array.isArray(data?.models) ? data.models.length : 0;
        return { ok: true, identity: 'Ollama online', detail: `${models} modelos instalados` };
      }
      default:
        return { ok: false, error: 'Verificação não implementada.' };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha de rede ao validar credencial.' };
  }
}

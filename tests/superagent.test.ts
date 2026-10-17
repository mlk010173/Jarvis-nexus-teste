/**
 * Testes do upgrade Superagente: raciocínio, conectores (validação real),
 * memória injetada no contexto e catálogo de provedores novos.
 * Padrão do projeto: node:test + node:assert.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { extractReasoning } from '../src/core/providers/service.ts';
import { MemoryService } from '../src/core/memory/memory-service.ts';
import {
  CONNECTOR_CATALOG,
  findConnector,
  CONNECTOR_CATEGORIES,
} from '../src/core/connectors/connectors-registry.ts';
import { verifyConnectorCredentials } from '../src/core/connectors/verify.ts';
import { PROVIDER_CATALOG, findProviderCatalogEntry } from '../src/core/providers/registry.ts';

test('extractReasoning extrai raciocínio de modelos thinking', () => {
  assert.equal(
    extractReasoning('O usuário quer X, então vou responder Y'),
    'O usuário quer X, então vou responder Y',
  );
});

test('extractReasoning retorna undefined sem raciocínio', () => {
  assert.equal(extractReasoning(''), undefined);
  assert.equal(extractReasoning(undefined as unknown as string), undefined);
});

test('Memória persistente gera bloco de contexto', () => {
  const ctx = MemoryService.buildMemoryContext();
  assert.ok(ctx.includes('['), 'contexto deve listar categorias');
  assert.ok(ctx.length > 20, 'contexto não pode ser vazio');
});

test('Memória respeita limite de caracteres', () => {
  assert.ok(MemoryService.buildMemoryContext(50).length <= 52);
});

test('Todos os conectores apontam para página oficial em HTTPS', () => {
  for (const c of CONNECTOR_CATALOG) {
    assert.ok(c.officialUrl.startsWith('https://'), `${c.id} sem officialUrl HTTPS`);
    assert.ok(c.docsUrl.startsWith('https://'), `${c.id} sem docsUrl HTTPS`);
    assert.ok(c.howTo.length > 0, `${c.id} sem passos`);
    assert.ok(c.tokenLabel.length > 0, `${c.id} sem rótulo de credencial`);
  }
});

test('Catálogo inclui conectores principais', () => {
  const ids = CONNECTOR_CATALOG.map((c) => c.id);
  for (const expected of [
    'base44',
    'github',
    'gmail',
    'telegram',
    'openrouter',
    'groq',
    'xai',
    'moonshot',
    'ollama',
    'opencode-zen',
  ]) {
    assert.ok(ids.includes(expected), `faltou ${expected}`);
  }
});

test('Base44 exige id do agente como campo extra', () => {
  assert.equal(findConnector('base44')?.extraField?.key, 'agentId');
});

test('Categorias cobrem todos os conectores', () => {
  const catIds = CONNECTOR_CATEGORIES.map((c) => c.id);
  for (const c of CONNECTOR_CATALOG) assert.ok(catIds.includes(c.category));
});

test('Conector desconhecido é rejeitado', async () => {
  const result = await verifyConnectorCredentials('inexistente', 'tok');
  assert.equal(result.ok, false);
});

test('Credencial vazia é rejeitada sem rede', async () => {
  const result = await verifyConnectorCredentials('github', '   ');
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /vazia/i);
});

// ===== Verificação REAL com fetch substituído =====

function mockFetch(status: number, body: unknown) {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  })) as unknown as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

test('Valida token do GitHub de verdade (GET /user)', async () => {
  const restore = mockFetch(200, { login: 'mlk010173', type: 'User' });
  try {
    const result = await verifyConnectorCredentials('github', 'ghp_valido');
    assert.equal(result.ok, true);
    assert.equal(result.identity, 'mlk010173');
  } finally {
    restore();
  }
});

test('Rejeita token inválido com erro do próprio serviço', async () => {
  const restore = mockFetch(401, { message: 'Bad credentials' });
  try {
    const result = await verifyConnectorCredentials('github', 'ghp_ruim');
    assert.equal(result.ok, false);
    assert.match(result.error ?? '', /401/);
  } finally {
    restore();
  }
});

test('Valida bot do Telegram via getMe', async () => {
  const restore = mockFetch(200, { ok: true, result: { username: 'jarvis_bot', first_name: 'Jarvis' } });
  try {
    const result = await verifyConnectorCredentials('telegram', '123:ABC');
    assert.equal(result.ok, true);
    assert.equal(result.identity, '@jarvis_bot');
  } finally {
    restore();
  }
});

test('Conta modelos ao validar chave de provedor de IA', async () => {
  const restore = mockFetch(200, { data: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }] });
  try {
    const result = await verifyConnectorCredentials('groq', 'gsk_ok');
    assert.equal(result.ok, true);
    assert.equal(result.detail, '3 modelos disponíveis');
  } finally {
    restore();
  }
});

test('Valida Gmail via perfil do usuário', async () => {
  const restore = mockFetch(200, { emailAddress: 'papaecodelta9@gmail.com', messagesTotal: 42 });
  try {
    const result = await verifyConnectorCredentials('gmail', 'ya29.xyz');
    assert.equal(result.ok, true);
    assert.equal(result.identity, 'papaecodelta9@gmail.com');
  } finally {
    restore();
  }
});

test('Catálogo de provedores inclui Grok, Kimi e Base44', () => {
  const ids = PROVIDER_CATALOG.map((p) => p.id);
  assert.ok(ids.includes('xai-grok'));
  assert.ok(ids.includes('kimi-moonshot'));
  assert.ok(ids.includes('base44-superagent'));
});

test('Endpoints oficiais nos provedores novos', () => {
  assert.equal(findProviderCatalogEntry('xai-grok')?.baseUrl, 'https://api.x.ai/v1');
  assert.equal(findProviderCatalogEntry('kimi-moonshot')?.baseUrl, 'https://api.moonshot.ai/v1');
  assert.equal(findProviderCatalogEntry('kimi-moonshot')?.envKey, 'MOONSHOT_API_KEY');
  assert.equal(findProviderCatalogEntry('xai-grok')?.envKey, 'XAI_API_KEY');
});

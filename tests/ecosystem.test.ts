import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidCron, scheduleJob, cancelJob, listJobs } from '../src/core/automation/cron-service.ts';
import { registerHook, listHooks, checkHookSecret, messageFromBody } from '../src/core/automation/webhook-registry.ts';
import { verifyMetaWebhook, parseIncomingWhatsApp, defaultRecipient } from '../src/core/channels/whatsapp.ts';
import { isAllowedUrl } from '../src/core/browser/live-browser.ts';
import { isSafeMcpEndpoint } from '../src/core/mcp/mcp-sdk-client.ts';

// ===== Cron =====
test('isValidCron aceita expressões de 5 campos', () => {
  assert.equal(isValidCron('0 8 * * *'), true);
  assert.equal(isValidCron('*/5 * * * *'), true);
});

test('isValidCron rejeita lixo', () => {
  assert.equal(isValidCron(''), false);
  assert.equal(isValidCron('não é cron'), false);
  assert.equal(isValidCron('* * *'), false);
});

test('scheduleJob registra, executa runner e cancelJob remove', async () => {
  const ran: string[] = [];
  const job = await scheduleJob('teste-x', '*/1 * * * *', 'ping', async (m) => {
    ran.push(m);
    return 'ok';
  });
  assert.equal(job.id, 'teste-x');
  assert.ok(listJobs().some((j) => j.id === 'teste-x'));
  assert.equal(cancelJob('teste-x'), true);
  assert.ok(!listJobs().some((j) => j.id === 'teste-x'));
});

test('scheduleJob exige mensagem', async () => {
  await assert.rejects(() => scheduleJob('vazio', '0 8 * * *', '   ', async () => ''));
});

// ===== Webhooks =====
test('webhook: registro, secret e hit', () => {
  registerHook('github-push', 'segredo');
  const hooks = listHooks();
  assert.ok(hooks.some((h) => h.id === 'github-push'));
  assert.equal(hooks.find((h) => h.id === 'github-push')?.secret, '***');
  assert.equal(checkHookSecret('github-push', 'errado').ok, false);
  assert.equal(checkHookSecret('github-push', 'segredo').ok, true);
  assert.equal(checkHookSecret('inexistente', undefined).ok, false);
});

test('webhook: messageFromBody usa campo message ou default', () => {
  assert.equal(messageFromBody('x', { message: 'execute o deploy' }), 'execute o deploy');
  assert.match(messageFromBody('x', { foo: 1 }), /Webhook x disparou/);
});

// ===== WhatsApp =====
test('verifyMetaWebhook valida o fluxo da Meta', () => {
  process.env.META_VERIFY_TOKEN = 'abc';
  assert.equal(verifyMetaWebhook({ 'hub.mode': 'subscribe', 'hub.verify_token': 'abc', 'hub.challenge': '42' }), '42');
  assert.equal(verifyMetaWebhook({ 'hub.mode': 'subscribe', 'hub.verify_token': 'errado', 'hub.challenge': '42' }), null);
});

test('parseIncomingWhatsApp extrai textos', () => {
  const payload = {
    entry: [{ changes: [{ value: { messages: [
      { id: 'm1', from: '5527998518705', text: { body: 'oi jarvis' } },
      { id: 'm2', from: '5511', text: { body: '   ' } },
      { id: 'm3', from: '5511' },
    ] } }] }],
  };
  const msgs = parseIncomingWhatsApp(payload);
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].text, 'oi jarvis');
});

test('defaultRecipient normaliza qualquer formato e cai no dono', () => {
  process.env.OWNER_WHATSAPP = '+55 27 99851-8705';
  assert.equal(defaultRecipient(), '5527998518705');
  assert.equal(defaultRecipient('+55 (51) 1 8888-7777'), '5551188887777');
  assert.equal(defaultRecipient('sem numeros'), '5527998518705');
});

// ===== Browser ao vivo =====
test('isAllowedUrl bloqueia hosts internos e protocolos estranhos', () => {
  delete process.env.LIVE_BROWSER_ALLOW_LOCAL;
  assert.equal(isAllowedUrl('https://exemplo.com'), true);
  assert.equal(isAllowedUrl('http://localhost:3000'), false);
  assert.equal(isAllowedUrl('http://169.254.169.254/meta'), false);
  assert.equal(isAllowedUrl('ftp://exemplo.com'), false);
  assert.equal(isAllowedUrl('coisa'), false);
});

// ===== MCP oficial =====
test('isSafeMcpEndpoint exige https ou localhost', () => {
  assert.equal(isSafeMcpEndpoint('https://servidor.com/mcp'), true);
  assert.equal(isSafeMcpEndpoint('http://localhost:8080/mcp'), true);
  assert.equal(isSafeMcpEndpoint('http://remoto.com/mcp'), false);
  assert.equal(isSafeMcpEndpoint('banana'), false);
});

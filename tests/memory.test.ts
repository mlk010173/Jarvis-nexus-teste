import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryService } from '../src/core/memory/memory-service.ts';
import type { MemoryItem } from '../src/core/memory/memory-service.ts';

test('MemoryService returns initial knowledge items', () => {
  const memories = MemoryService.getMemories();
  assert.equal(memories.length >= 3, true);
});

test('MemoryService saves a new memory with generated ID and timestamps', () => {
  const saved = MemoryService.saveMemory({
    category: 'knowledge',
    title: 'Teste de Memória Automática',
    content: 'Conteúdo de teste para validação de salvamento unitário.',
    tags: ['teste', 'vitest', 'unitario'],
  });

  assert.equal(typeof saved.id, 'string');
  assert.equal(saved.id.startsWith('mem-'), true);
  assert.equal(typeof saved.createdAt, 'number');
  assert.equal(saved.title, 'Teste de Memória Automática');
});

test('MemoryService scores search results giving higher weights to title matches', () => {
  const query = 'Dispositivo';
  const results = MemoryService.searchMemories(query);

  assert.equal(results.length > 0, true);
  assert.equal(results[0].score >= 3, true);
  assert.equal(results[0].item.title.includes('Dispositivo'), true);
});

test('MemoryService exports valid JSON string with metadata schema', () => {
  const exported = MemoryService.exportToJson();
  assert.equal(typeof exported, 'string');

  const parsed = JSON.parse(exported);
  assert.equal(parsed.schemaVersion, '1.0');
  assert.equal(Array.isArray(parsed.memories), true);
  assert.equal(parsed.count, parsed.memories.length);
});

test('MemoryService imports memory items and validates structure', () => {
  const sampleImport = JSON.stringify({
    schemaVersion: '1.0',
    memories: [
      {
        id: `mem-import-test-${Date.now()}`,
        category: 'preference',
        title: 'Preferência Importada via JSON',
        content: 'Configuração de teste importada com sucesso.',
        tags: ['import', 'teste'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
  });

  const res = MemoryService.importFromJson(sampleImport);
  assert.equal(res.success, true);
  assert.equal(res.count, 1);
});

test('MemoryService rejects malformed JSON on import', () => {
  const badImport = '{ this is not valid json }';
  const res = MemoryService.importFromJson(badImport);
  assert.equal(res.success, false);
  assert.equal(res.count, 0);
  assert.equal(Boolean(res.error), true);
});

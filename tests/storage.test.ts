import test from 'node:test';
import assert from 'node:assert/strict';
import { StorageService } from '../src/core/storage/storage-service.ts';
import type { JarvisBackupBundle } from '../src/core/storage/storage-service.ts';

test('StorageService exports full backup bundle with valid schema and metadata', () => {
  const jsonStr = StorageService.exportFullBackup({
    autonomyLevel: 4,
    theme: 'dark',
    soundEnabled: true,
    messages: [
      {
        id: 'msg-test-1',
        role: 'user',
        content: 'Olá JARVIS',
        timestamp: Date.now(),
      },
    ],
    currentPlan: null,
  });

  assert.equal(typeof jsonStr, 'string');
  const bundle = JSON.parse(jsonStr) as JarvisBackupBundle;
  assert.equal(bundle.schemaVersion, '1.0');
  assert.equal(bundle.app, 'JARVIS NEXUS');
  assert.equal(bundle.autonomyLevel, 4);
  assert.equal(bundle.messages.length, 1);
  assert.equal(Array.isArray(bundle.memories), true);
});

test('StorageService imports valid full backup bundle successfully', () => {
  const sampleBundle = {
    schemaVersion: '1.0',
    app: 'JARVIS NEXUS',
    exportedAt: new Date().toISOString(),
    autonomyLevel: 3,
    theme: 'light',
    soundEnabled: false,
    messages: [
      {
        id: 'msg-bundle-1',
        role: 'assistant',
        content: 'Mensagem restaurada do backup',
        timestamp: Date.now(),
      },
    ],
    currentPlan: null,
    memories: [],
  };

  const res = StorageService.importFullBackup(JSON.stringify(sampleBundle));
  assert.equal(res.success, true);
  assert.equal(res.data?.autonomyLevel, 3);
  assert.equal(res.data?.theme, 'light');
  assert.equal(res.data?.messages.length, 1);
});

test('StorageService rejects foreign backups not belonging to JARVIS NEXUS', () => {
  const foreignBackup = JSON.stringify({
    schemaVersion: '1.0',
    app: 'SOME_OTHER_APP',
    messages: [],
  });

  const res = StorageService.importFullBackup(foreignBackup);
  assert.equal(res.success, false);
  assert.equal(res.error?.includes('JARVIS NEXUS'), true);
});

test('StorageService handles invalid JSON payload gracefully without throwing', () => {
  const res = StorageService.importFullBackup('invalid json syntax {{{');
  assert.equal(res.success, false);
  assert.equal(Boolean(res.error), true);
});

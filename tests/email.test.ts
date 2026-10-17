/**
 * Testes do conector de e-mail real (Gmail via senha de app / IMAP + SMTP).
 * 100% offline: valida catálogo, registro, envKeys e formatos de erro.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { TOOLS_CATALOG } from '../src/core/tools/tools-registry.ts';
import { CONNECTOR_CATALOG, findConnector } from '../src/core/connectors/connectors-registry.ts';
import { verifyConnectorCredentials } from '../src/core/connectors/verify.ts';

describe('Ferramentas de e-mail no catálogo', () => {
  it('expõe email_inbox (leitura, sem aprovação) e email_send (com aprovação)', () => {
    const inbox = TOOLS_CATALOG.find((t) => t.name === 'email_inbox');
    const send = TOOLS_CATALOG.find((t) => t.name === 'email_send');
    assert.ok(inbox, 'email_inbox ausente');
    assert.ok(send, 'email_send ausente');
    assert.equal(inbox.requiresApproval, false, 'inbox é somente leitura');
    assert.equal(send.requiresApproval, true, 'envio exige aprovação');
    assert.ok(send.parameters.some((p) => p.name === 'to' && p.required));
  });
});

describe('Conector gmail-imap (senha de app)', () => {
  it('está no catálogo com envKeys do servidor', () => {
    const c = findConnector('gmail-imap');
    assert.ok(c, 'conector gmail-imap ausente');
    assert.equal(c.category, 'mensageria');
    assert.deepEqual(c.envKeys, ['GMAIL_USER', 'GMAIL_APP_PASSWORD']);
    assert.equal(c.verify.kind, 'gmail-imap');
  });

  it('exige e-mail no campo extra (ou GMAIL_USER) para validar', async () => {
    const result = await verifyConnectorCredentials('gmail-imap', 'abcd efgh ijkl mnop', '');
    assert.equal(result.ok, false);
    assert.match(result.error ?? '', /e-mail/i);
  });

  it('rejeita senha de app com tamanho errado antes de ir à rede', async () => {
    const result = await verifyConnectorCredentials('gmail-imap', 'curta', 'usuario.teste@gmail.com');
    assert.equal(result.ok, false);
    assert.match(result.error ?? '', /16 letras/);
  });
});

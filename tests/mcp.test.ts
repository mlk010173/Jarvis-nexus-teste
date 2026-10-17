import test from 'node:test';
import assert from 'node:assert/strict';
import { McpClient, DEFAULT_MCP_SERVERS, REGISTERED_MCP_TOOLS } from '../src/core/mcp/mcp-client.ts';

test('McpClient registers open-source MCP servers', () => {
  const servers = McpClient.getServers();
  assert.equal(servers.length >= 4, true);
  assert.equal(servers.some(s => s.id === 'mcp-filesystem'), true);
  assert.equal(servers.some(s => s.id === 'mcp-github'), true);
});

test('McpClient lists MCP tools with valid schemas', () => {
  const tools = McpClient.getTools();
  assert.equal(tools.length >= 5, true);
  const readTool = tools.find(t => t.name === 'mcp_fs_read_file');
  assert.equal(Boolean(readTool), true);
  assert.equal(readTool?.inputSchema.type, 'object');
  assert.equal(readTool?.inputSchema.required?.includes('path'), true);
});

test('McpClient handles JSON-RPC 2.0 tools/list request', async () => {
  const response = await McpClient.dispatchJsonRpc({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
  });

  assert.equal(response.jsonrpc, '2.0');
  assert.equal(response.id, 1);
  assert.equal(Array.isArray((response.result as any).tools), true);
});

test('McpClient handles JSON-RPC 2.0 tools/call request', async () => {
  const response = await McpClient.dispatchJsonRpc({
    jsonrpc: '2.0',
    id: 'req-call-1',
    method: 'tools/call',
    params: {
      name: 'mcp_sqlite_query',
      arguments: { sql_statement: 'SELECT * FROM tasks;' },
    },
  });

  assert.equal(response.jsonrpc, '2.0');
  assert.equal(response.id, 'req-call-1');
  assert.equal(Boolean(response.result), true);
});

/**
 * Cliente MCP com o SDK OFICIAL (@modelcontextprotocol/sdk).
 *
 * Conecta a servidores MCP remotos via Streamable HTTP (ou SSE legado),
 * lista ferramentas reais e invoca. Diferente do registry em memória
 * (demonstração), isto fala com servidores de verdade.
 */

export interface RemoteMcpTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

export interface RemoteMcpResult {
  ok: boolean;
  serverInfo?: { name?: string; version?: string };
  tools?: RemoteMcpTool[];
  error?: string;
  transport: 'streamable-http' | 'sse';
}

export function isSafeMcpEndpoint(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/** Lista ferramentas de um servidor MCP remoto usando o SDK oficial. */
export async function connectRemoteMcp(endpoint: string, headers?: Record<string, string>): Promise<RemoteMcpResult> {
  if (!isSafeMcpEndpoint(endpoint)) {
    return { ok: false, error: 'Endpoint MCP deve ser https (ou localhost).', transport: 'streamable-http' };
  }
  try {
    const sdk = (await import('@modelcontextprotocol/sdk/client/index.js')) as unknown as {
      Client: new (opts: Record<string, unknown>) => {
        connect(t: unknown, opts?: Record<string, unknown>): Promise<void>;
        listTools(): Promise<{ tools: RemoteMcpTool[] }>;
        getServerVersion?(): unknown;
        close(): Promise<void>;
      };
    };
    const transports = (await import('@modelcontextprotocol/sdk/client/streamableHttp.js')) as {
      StreamableHTTPClientTransport: new (u: URL, opts?: Record<string, unknown>) => unknown;
    };
    const sseTransport = (await import('@modelcontextprotocol/sdk/client/sse.js')) as {
      SSEClientTransport: new (u: URL, opts?: Record<string, unknown>) => unknown;
    };

    const client = new sdk.Client({ name: 'jarvis-nexus', version: '1.0.0' });
    let transport: unknown;
    let used: 'streamable-http' | 'sse' = 'streamable-http';
    try {
      transport = new transports.StreamableHTTPClientTransport(new URL(endpoint), {
        requestInit: { headers: { Accept: 'application/json, text/event-stream', ...headers } },
      });
      await client.connect(transport, { timeout: 15000 });
    } catch {
      await client.close().catch(() => undefined);
      used = 'sse';
      transport = new sseTransport.SSEClientTransport(new URL(endpoint), { requestInit: { headers } });
      await client.connect(transport, { timeout: 15000 });
    }
    const { tools } = await client.listTools();
    let serverInfo: RemoteMcpResult['serverInfo'];
    try {
      const info = await (client as unknown as { getServerVersion: () => Promise<RemoteMcpResult['serverInfo']> }).getServerVersion();
      serverInfo = info ?? undefined;
    } catch {
      serverInfo = undefined;
    }
    await client.close().catch(() => undefined);
    return { ok: true, tools, serverInfo, transport: used };
  } catch (err) {
    return {
      ok: false,
      error: `Conexão MCP falhou: ${err instanceof Error ? err.message : String(err)}`,
      transport: 'streamable-http',
    };
  }
}

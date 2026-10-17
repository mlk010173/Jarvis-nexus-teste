/**
 * Model Context Protocol (MCP) - Specification Types
 * Reference: https://modelcontextprotocol.io
 */

export interface McpServerConfig {
  id: string;
  name: string;
  version: string;
  description: string;
  transport: 'stdio' | 'sse' | 'in-memory';
  endpoint?: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  capabilities: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
    logging?: boolean;
  };
  toolsCount: number;
}

export interface McpTool {
  name: string;
  description: string;
  serverId: string;
  serverName: string;
  inputSchema: {
    type: string;
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  serverId: string;
}

export interface McpPrompt {
  name: string;
  description: string;
  arguments?: {
    name: string;
    description: string;
    required: boolean;
  }[];
  serverId: string;
}

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

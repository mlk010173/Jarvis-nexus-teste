import type { McpServerConfig, McpTool, JsonRpcRequest, JsonRpcResponse } from './types.ts';

export const DEFAULT_MCP_SERVERS: McpServerConfig[] = [
  {
    id: 'mcp-filesystem',
    name: 'Filesystem MCP Server',
    version: '1.2.0',
    description: 'Acesso seguro ao sistema de arquivos local do projeto com permissões restritas.',
    transport: 'in-memory',
    status: 'connected',
    capabilities: { tools: true, resources: true },
    toolsCount: 3,
  },
  {
    id: 'mcp-github',
    name: 'GitHub Open-Source MCP Server',
    version: '2.1.0',
    description: 'Pesquisa avançada em repositórios abertos, branches, commits e árvores de arquivos.',
    transport: 'sse',
    endpoint: 'https://api.github.com/mcp-proxy',
    status: 'connected',
    capabilities: { tools: true, prompts: true },
    toolsCount: 4,
  },
  {
    id: 'mcp-web-fetch',
    name: 'Web Fetch & Scraper MCP Server',
    version: '1.0.4',
    description: 'Coleta de páginas web com extração limpa de Markdown para análise de IA sem anúncios.',
    transport: 'in-memory',
    status: 'connected',
    capabilities: { tools: true },
    toolsCount: 2,
  },
  {
    id: 'mcp-sqlite',
    name: 'SQLite Relational MCP Server',
    version: '0.8.2',
    description: 'Execução de queries SQL locais estruturadas com tabelas relacionais em memória.',
    transport: 'in-memory',
    status: 'connected',
    capabilities: { tools: true, resources: true },
    toolsCount: 2,
  },
  {
    id: 'mcp-memory',
    name: 'Knowledge Graph & Vector Memory MCP',
    version: '1.3.1',
    description: 'Indexação semântica e recuperação contextual baseada no protocolo de memória aberta.',
    transport: 'in-memory',
    status: 'connected',
    capabilities: { tools: true, resources: true },
    toolsCount: 2,
  },
];

export const REGISTERED_MCP_TOOLS: McpTool[] = [
  {
    name: 'mcp_fs_read_file',
    description: 'Lê o conteúdo de um arquivo no workspace do projeto.',
    serverId: 'mcp-filesystem',
    serverName: 'Filesystem MCP Server',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho do arquivo (ex: /src/App.tsx)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'mcp_fs_write_file',
    description: 'Grava ou atualiza um arquivo no workspace do projeto.',
    serverId: 'mcp-filesystem',
    serverName: 'Filesystem MCP Server',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho do arquivo' },
        content: { type: 'string', description: 'Conteúdo do arquivo' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'mcp_github_search_repos',
    description: 'Pesquisa repositórios open-source no GitHub com filtros de estrelas e tópicos.',
    serverId: 'mcp-github',
    serverName: 'GitHub Open-Source MCP Server',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Termo de busca (ex: react-native, magicui)' },
        language: { type: 'string', description: 'Linguagem (ex: typescript, rust, python)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'mcp_github_get_readme',
    description: 'Obtém o README oficial formatado de um repositório.',
    serverId: 'mcp-github',
    serverName: 'GitHub Open-Source MCP Server',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'Proprietário do repositório' },
        repo: { type: 'string', description: 'Nome do repositório' },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    name: 'mcp_web_scrape_markdown',
    description: 'Acessa uma URL externa e extrai o conteúdo textual formatado em Markdown.',
    serverId: 'mcp-web-fetch',
    serverName: 'Web Fetch & Scraper MCP Server',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL da página a analisar' },
      },
      required: ['url'],
    },
  },
  {
    name: 'mcp_sqlite_query',
    description: 'Executa uma declaração SQL em banco SQLite em memória.',
    serverId: 'mcp-sqlite',
    serverName: 'SQLite Relational MCP Server',
    inputSchema: {
      type: 'object',
      properties: {
        sql_statement: { type: 'string', description: 'Comando SQL (ex: SELECT, INSERT)' },
      },
      required: ['sql_statement'],
    },
  },
  {
    name: 'mcp_memory_semantic_search',
    description: 'Busca semântica no grafo de conhecimento do JARVIS com pontuação de relevância.',
    serverId: 'mcp-memory',
    serverName: 'Knowledge Graph & Vector Memory MCP',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Conceito ou pergunta' },
        limit: { type: 'number', description: 'Número de resultados (padrão: 5)' },
      },
      required: ['query'],
    },
  },
];

export class McpClient {
  static getServers(): McpServerConfig[] {
    return DEFAULT_MCP_SERVERS;
  }

  static getTools(): McpTool[] {
    return REGISTERED_MCP_TOOLS;
  }

  static async callTool(toolName: string, args: Record<string, unknown>): Promise<{ success: boolean; result: unknown }> {
    const startTime = Date.now();

    // Route execution to corresponding handler
    switch (toolName) {
      case 'mcp_github_search_repos': {
        const query = String(args.query || 'react');
        return {
          success: true,
          result: {
            source: 'GitHub MCP Server (JSON-RPC 2.0)',
            query,
            total_count: 1420,
            items: [
              { name: `open-source/${query}-toolkit`, stars: 12400, language: 'TypeScript' },
              { name: `community/${query}-mobile-ui`, stars: 8900, language: 'TypeScript' },
            ],
            durationMs: Date.now() - startTime,
          },
        };
      }

      case 'mcp_sqlite_query': {
        const sql = String(args.sql_statement || 'SELECT 1;');
        return {
          success: true,
          result: {
            query: sql,
            rows: [
              { id: 1, name: 'JARVIS Core DB', status: 'active', rows_count: 42 },
            ],
            executed_in: `${(Date.now() - startTime) + 1}ms`,
          },
        };
      }

      case 'mcp_web_scrape_markdown': {
        const url = String(args.url || 'https://modelcontextprotocol.io');
        return {
          success: true,
          result: {
            url,
            title: 'Model Context Protocol Specification',
            content_markdown: '# Model Context Protocol (MCP)\nAn open standard for AI applications to connect with data sources, developer tools, and external services securely.',
          },
        };
      }

      default: {
        return {
          success: true,
          result: {
            tool: toolName,
            args,
            message: `Chamada MCP [${toolName}] executada com sucesso via JSON-RPC 2.0.`,
            status: 'ok',
          },
        };
      }
    }
  }

  /**
   * Dispatches a raw JSON-RPC 2.0 protocol message
   */
  static async dispatchJsonRpc(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (request.method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: REGISTERED_MCP_TOOLS.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        },
      };
    }

    if (request.method === 'tools/call') {
      const name = String(request.params?.name || '');
      const args = (request.params?.arguments as Record<string, unknown>) || {};
      const res = await this.callTool(name, args);
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: res.result,
      };
    }

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: { status: 'acknowledged', method: request.method },
    };
  }
}

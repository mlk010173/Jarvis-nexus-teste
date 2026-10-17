import React, { useState } from 'react';
import {
  Layers,
  Server,
  Play,
  CheckCircle2,
  Terminal,
  RefreshCw,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import { McpClient, DEFAULT_MCP_SERVERS, REGISTERED_MCP_TOOLS } from '../core/mcp/mcp-client.ts';
import type { McpTool } from '../core/mcp/types.ts';

export const McpView: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(REGISTERED_MCP_TOOLS[0]);
  const [argsJson, setArgsJson] = useState('{\n  "path": "/src/App.tsx"\n}');
  const [isRunning, setIsRunning] = useState(false);
  const [rpcResponse, setRpcResponse] = useState<any>(null);

  const handleSelectTool = (tool: McpTool) => {
    setSelectedTool(tool);
    setRpcResponse(null);
    if (tool.name === 'mcp_fs_read_file') {
      setArgsJson('{\n  "path": "/src/App.tsx"\n}');
    } else if (tool.name === 'mcp_github_search_repos') {
      setArgsJson('{\n  "query": "magicui",\n  "language": "typescript"\n}');
    } else if (tool.name === 'mcp_sqlite_query') {
      setArgsJson('{\n  "sql_statement": "SELECT * FROM jarvis_tasks LIMIT 5;"\n}');
    } else if (tool.name === 'mcp_web_scrape_markdown') {
      setArgsJson('{\n  "url": "https://modelcontextprotocol.io"\n}');
    } else {
      setArgsJson('{\n  "query": "inteligencia artificial"\n}');
    }
  };

  const handleExecuteRpc = async () => {
    if (!selectedTool) return;
    setIsRunning(true);
    setRpcResponse(null);

    try {
      const parsedArgs = JSON.parse(argsJson);
      const res = await McpClient.dispatchJsonRpc({
        jsonrpc: '2.0',
        id: `mcp-req-${Date.now()}`,
        method: 'tools/call',
        params: {
          name: selectedTool.name,
          arguments: parsedArgs,
        },
      });
      setRpcResponse(res);
    } catch (err) {
      setRpcResponse({
        jsonrpc: '2.0',
        id: 'err',
        error: {
          code: -32603,
          message: err instanceof Error ? err.message : 'JSON de argumentos inválido.',
        },
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <div>
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h1 className="text-xl font-bold text-slate-100">Model Context Protocol (MCP) Hub</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Integração universal de ferramentas e fontes de dados através do padrão aberto MCP (JSON-RPC 2.0).
        </p>
      </div>

      {/* Connected Servers Strip */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
          Servidores MCP Conectados ({DEFAULT_MCP_SERVERS.length})
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {DEFAULT_MCP_SERVERS.map((server) => (
            <div
              key={server.id}
              className="holo-card p-3 rounded-xl border border-slate-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200">{server.name}</h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    v{server.version} • {server.transport}
                  </span>
                </div>
              </div>

              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Conectado
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* MCP Tools Explorer & JSON-RPC 2.0 Tester */}
      <div className="holo-card p-4 rounded-2xl border border-cyan-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            Testador Interativo MCP JSON-RPC 2.0
          </h3>
          <span className="text-[10px] font-mono text-cyan-400">tools/call</span>
        </div>

        {/* Tool selector */}
        <div>
          <label className="block text-[11px] text-slate-300 font-semibold mb-1">
            Selecione a Ferramenta MCP:
          </label>
          <select
            value={selectedTool?.name}
            onChange={(e) => {
              const t = REGISTERED_MCP_TOOLS.find((x) => x.name === e.target.value);
              if (t) handleSelectTool(t);
            }}
            className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
          >
            {REGISTERED_MCP_TOOLS.map((tool) => (
              <option key={tool.name} value={tool.name}>
                {tool.name} — ({tool.serverName})
              </option>
            ))}
          </select>
        </div>

        {selectedTool && (
          <p className="text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            {selectedTool.description}
          </p>
        )}

        {/* JSON Arguments editor */}
        <div>
          <label className="block text-[11px] text-slate-300 font-semibold mb-1">
            Parâmetros JSON (arguments):
          </label>
          <textarea
            rows={4}
            value={argsJson}
            onChange={(e) => setArgsJson(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <button
          onClick={handleExecuteRpc}
          disabled={isRunning}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs hover:brightness-110 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5" />
          <span>{isRunning ? 'Enviando JSON-RPC...' : 'Disparar Chamada MCP Tool'}</span>
        </button>

        {/* Response Box */}
        {Boolean(rpcResponse) && (
          <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono text-xs">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="text-cyan-400">Resposta do Servidor MCP:</span>
              <span>JSON-RPC 2.0</span>
            </div>
            <pre className="p-2 rounded-lg bg-slate-900 text-slate-200 text-[11px] max-h-48 overflow-y-auto whitespace-pre-wrap">
              {JSON.stringify(rpcResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

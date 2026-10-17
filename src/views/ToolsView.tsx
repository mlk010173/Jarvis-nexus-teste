import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Play,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  X,
  Code2,
  Search,
  Cpu,
  Layers,
  Terminal,
} from 'lucide-react';
import { TOOLS_CATALOG, executeTool } from '../core/tools/tools-registry.ts';
import { ToolDefinition, ToolExecutionResult } from '../core/tools/types.ts';
import { useDebounce } from '../hooks/useDebounce.ts';

/**
 * Ferramentas de rede/shell executam no SERVIDOR (CORS e sandbox):
 * roteia para os endpoints reais e cai para execução local se a API
 * estiver inacessível (ex.: preview estático no GitHub Pages).
 */
const SERVER_ROUTES: Record<string, string> = {
  web_search: '/api/tools/search',
  web_fetch: '/api/tools/fetch',
  shell_exec: '/api/tools/shell',
  code_eval: '/api/tools/code-eval',
};

async function runToolWithRouting(
  toolName: string,
  params: Record<string, string>,
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const route = SERVER_ROUTES[toolName];
  if (route) {
    try {
      const res = await fetch(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok && !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return {
        toolName,
        success: res.ok && (data.success ?? data.allowed ?? true),
        output: data,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        toolName,
        success: false,
        output: null,
        error: `${err instanceof Error ? err.message : String(err)} — servidor offline? No GitHub Pages (preview estático) as ferramentas de rede/shell exigem o backend rodando (npm start).`,
        durationMs: Date.now() - startTime,
      };
    }
  }
  return executeTool(toolName, params);
}

export const ToolsView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<ToolExecutionResult | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 250);

  const filteredTools = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    if (!q) return TOOLS_CATALOG;
    return TOOLS_CATALOG.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [debouncedSearch]);

  const handleOpenTool = (tool: ToolDefinition) => {
    setSelectedTool(tool);
    setExecutionResult(null);
    const defaults: Record<string, string> = {};
    tool.parameters.forEach((p) => {
      defaults[p.name] = p.name === 'query' ? 'Magic UI React' : p.name === 'repoName' ? 'magicui' : p.name === 'code' ? '2 + 2 * 10' : p.name === 'target' ? 'android_termux' : '';
    });
    setParamValues(defaults);
  };

  const handleRunTool = async () => {
    if (!selectedTool) return;
    setIsRunning(true);
    setExecutionResult(null);

    try {
      const res = await runToolWithRouting(selectedTool.name, paramValues);
      setExecutionResult(res);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Catálogo de Ferramentas & Plugins</h1>
        <p className="text-xs text-slate-400 mt-1">
          Ferramentas autorizadas com esquemas validados e privilégios mínimos de execução.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative flex items-center bg-slate-900 rounded-2xl border border-slate-800 focus-within:border-cyan-400 p-1.5 transition-all">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar ferramentas (ex: web, code, bash, memory)..."
          className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
          aria-label="Buscar ferramentas autorizadas"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-slate-400 hover:text-white mr-2"
            aria-label="Limpar busca"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredTools.map((tool) => (
          <div
            key={tool.name}
            className="holo-card p-4 rounded-2xl flex flex-col justify-between hover:holo-card-active transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-100">{tool.title}</h3>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {tool.name} • {tool.category}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-mono">
                  {tool.requiresApproval ? (
                    <span className="flex items-center gap-1 text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                      <ShieldAlert className="w-3 h-3" />
                      Requer Aprovação
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                      <ShieldCheck className="w-3 h-3" />
                      Autorizado
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                {tool.description}
              </p>

              {tool.sideEffects && (
                <div className="text-[10px] text-amber-300/80 font-mono mt-2 bg-amber-950/20 p-1.5 rounded-lg border border-amber-500/20">
                  Aviso: {tool.sideEffects}
                </div>
              )}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">
                {tool.parameters.length} parâmetros definidos
              </span>

              <button
                onClick={() => handleOpenTool(tool)}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-cyan-500/30"
              >
                <Play className="w-3 h-3" />
                <span>Testar</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Tool Runner Modal */}
      {selectedTool && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="w-full max-w-lg holo-card rounded-3xl p-5 border border-cyan-500/40 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  Testar Ferramenta: {selectedTool.title}
                </h2>
                <span className="text-[10px] font-mono text-cyan-400">{selectedTool.name}</span>
              </div>

              <button
                onClick={() => setSelectedTool(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Parameters inputs */}
            <div className="space-y-3 text-xs">
              {selectedTool.parameters.length === 0 ? (
                <p className="text-slate-400">Esta ferramenta não necessita de parâmetros adicionais.</p>
              ) : (
                selectedTool.parameters.map((param) => (
                  <div key={param.name}>
                    <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                      {param.name} ({param.type}){param.required && <span className="text-rose-400 ml-1">*</span>}
                    </label>
                    <input
                      type="text"
                      value={paramValues[param.name] || ''}
                      onChange={(e) =>
                        setParamValues({ ...paramValues, [param.name]: e.target.value })
                      }
                      placeholder={param.description}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:border-cyan-400 focus:outline-none font-mono"
                    />
                  </div>
                ))
              )}
            </div>

            <button
              onClick={handleRunTool}
              disabled={isRunning}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs hover:brightness-110 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isRunning ? 'Executando ferramenta...' : 'Executar Ferramenta Agora'}</span>
            </button>

            {/* Result Box */}
            {executionResult && (
              <div className="mt-3 p-3 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between text-[10px]">
                  <span className={executionResult.success ? 'text-emerald-400' : 'text-rose-400'}>
                    Status: {executionResult.success ? 'Sucesso' : 'Falha'}
                  </span>
                  <span className="text-slate-400">{executionResult.durationMs}ms</span>
                </div>

                <div className="max-h-48 overflow-y-auto p-2 rounded-xl bg-slate-900/90 text-slate-200 text-[11px]">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(executionResult.output || executionResult.error, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

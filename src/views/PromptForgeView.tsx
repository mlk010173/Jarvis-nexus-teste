import React, { useState } from 'react';
import {
  Wand2,
  Sparkles,
  Play,
  Copy,
  Check,
  Cpu,
  Layers,
  ArrowRight,
  Sliders,
  Terminal,
} from 'lucide-react';

interface PromptForgeViewProps {
  onRunGeneratedPrompt: (prompt: string) => void;
}

export const PromptForgeView: React.FC<PromptForgeViewProps> = ({ onRunGeneratedPrompt }) => {
  const [topicInput, setTopicInput] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const presets = [
    {
      title: 'App To-Do Full-Stack Magic UI',
      desc: 'Gera aplicativo móvel completo com persistência local e animações Magic UI.',
      idea: 'Criar um app de lista de tarefas com interface moderna, microanimações do Magic UI, persistência no SQLite e deploy via Termux no celular.',
    },
    {
      title: 'Investigador Autônomo com MCP',
      desc: 'Pesquisa fontes na web, cruza dados com GitHub e salva no banco de conhecimento.',
      idea: 'Ativar o Agente de Pesquisa com ferramentas MCP para investigar as últimas bibliotecas de IA open-source e gerar relatório executivo.',
    },
    {
      title: 'Auditor de Segurança & Penetration Test',
      desc: 'Testa defesas contra injeção de comandos, privilégios mínimos e vazamento de chaves.',
      idea: 'Realizar auditoria de segurança rigorosa em todos os scripts do projeto, verificando injeção de comandos e conformidade com OWASP.',
    },
  ];

  const handleGenerate = (baseIdea?: string) => {
    const input = baseIdea || topicInput;
    if (!input.trim()) return;

    setIsGenerating(true);

    setTimeout(() => {
      const promptTemplate = `# SISTEMA JARVIS NEXUS // DIRETIVA DE EXECUÇÃO MULTIAGENTE DE ELITE

## 1. OBJETIVO PRINCIPAL
"${input.trim()}"

## 2. ATRIBUIÇÃO DOS SUBAGENTES
- [NEXUS ORCHESTRATOR]: Decompor o objetivo em etapas atômicas e coordenar dependências.
- [AGENTE DE CÓDIGO]: Buscar repositórios base open-source compatíveis (MIT/Apache) e estruturar código limpo com TypeScript.
- [AGENTE DE UI/UX]: Aplicar componentes visuais futuristas com Magic UI, Astra UI e Tailwind CSS, otimizados para ergonomia de celular.
- [AGENTE DE DEPLOY]: Configurar ambiente de execução local sem dependências externas pagas (PWA e Android Termux).
- [AGENTE DE SEGURANÇA]: Auditar comandos e garantir isolamento contra execução de código malicioso.

## 3. PROTOCOLO DE FERRAMENTAS & MCP
- Conectar aos servidores MCP: filesystem-mcp, github-mcp, web-fetch-mcp.
- Exigir autorização humana antes de ações de alto impacto.

## 4. CRITÉRIOS DE SUCESSO
1. Código 100% funcional sem dependências quebradas.
2. Execução testada no navegador mobile e sandbox visual.
3. Resposta consolidada com instruções claras em português.`;

      setGeneratedPrompt(promptTemplate);
      setIsGenerating(false);
    }, 400);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = () => {
    if (!generatedPrompt) return;
    onRunGeneratedPrompt(generatedPrompt);
  };

  return (
    <div className="space-y-4 pb-24">
      <div>
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-cyan-400" />
          <h1 className="text-xl font-bold text-slate-100">Prompt Forge & Otimizador</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Gere super-prompts de arquitetura multiagente prontos para execução autônoma imediata.
        </p>
      </div>

      {/* Preset Cards */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
          Modelos de Prompt de Alto Rendimento
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setTopicInput(preset.idea);
                handleGenerate(preset.idea);
              }}
              className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group"
            >
              <div className="font-semibold text-xs text-slate-200 group-hover:text-cyan-300">
                {preset.title}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                {preset.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Idea Input */}
      <div className="holo-card p-4 rounded-2xl space-y-3">
        <label className="block text-xs font-semibold text-slate-200">
          Descreva sua ideia ou solicitação:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            placeholder="Ex: Criar um dashboard financeiro local com gráficos Recharts e SQLite..."
            className="flex-1 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
          />
          <button
            onClick={() => handleGenerate()}
            disabled={!topicInput.trim() || isGenerating}
            className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gerar Super-Prompt</span>
          </button>
        </div>
      </div>

      {/* Generated Super-Prompt Area */}
      {generatedPrompt && (
        <div className="holo-card p-4 rounded-2xl border border-cyan-400/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              Super-Prompt Estruturado Criado
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
            {generatedPrompt}
          </div>

          <button
            onClick={handleRun}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-slate-950 font-bold text-xs hover:brightness-110 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Executar este Super-Prompt Agora com o JARVIS</span>
          </button>
        </div>
      )}
    </div>
  );
};

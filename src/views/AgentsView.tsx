import React, { useState } from 'react';
import {
  Brain,
  Code2,
  Search,
  Palette,
  Cloud,
  Cpu,
  Database,
  FileSpreadsheet,
  Workflow,
  Mic,
  ShieldAlert,
  CheckCheck,
  Plus,
  X,
  Play,
  Check,
  Sparkles,
} from 'lucide-react';
import { AgentProfile } from '../core/orchestrator/types.ts';

interface AgentsViewProps {
  agents: AgentProfile[];
  onSelectAgent: (agent: AgentProfile) => void;
  onCreateAgent: (agent: AgentProfile) => void;
  onRunAgentDirectly: (agent: AgentProfile) => void;
}

// Icon mapping helper
const ICONS: Record<string, React.ElementType> = {
  Brain,
  Code2,
  Search,
  Palette,
  Cloud,
  Cpu,
  Database,
  FileSpreadsheet,
  Workflow,
  Mic,
  ShieldAlert,
  CheckCheck,
};

export const AgentsView: React.FC<AgentsViewProps> = ({
  agents,
  onCreateAgent,
  onRunAgentDirectly,
}) => {
  const [filterTab, setFilterTab] = useState<'todos' | 'superagente' | 'autonomos' | 'especialistas'>('todos');
  const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null);
  const [isCreatingModalOpen, setIsCreatingModalOpen] = useState(false);

  // New Custom Agent Form State
  const [customName, setCustomName] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');

  const filteredAgents = agents.filter((agent) => {
    if (filterTab === 'superagente') return agent.role === 'orchestrator';
    if (filterTab === 'autonomos') return agent.role === 'autonomous';
    if (filterTab === 'especialistas') return agent.role !== 'orchestrator' && agent.role !== 'autonomous';
    return true;
  });

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newAgent: AgentProfile = {
      id: `custom-agent-${Date.now()}`,
      name: customName,
      role: 'custom',
      title: customTitle || 'Agente Especialista Personalizado',
      description: customDescription || 'Agente customizado criado pelo usuário.',
      instructions: customInstructions || 'Execute a tarefa atribuída com precisão e relate o resultado.',
      avatarIcon: 'Cpu',
      model: 'gemini-3.8-flash / local',
      allowedTools: ['web_search', 'read_repository'],
      autonomyLevel: 4,
      status: 'idle',
      isCustom: true,
      colorScheme: {
        bg: 'rgba(56, 189, 248, 0.15)',
        border: 'rgba(56, 189, 248, 0.5)',
        text: '#38bdf8',
        glow: 'rgba(56, 189, 248, 0.3)',
      },
    };

    onCreateAgent(newAgent);
    setIsCreatingModalOpen(false);
    setCustomName('');
    setCustomTitle('');
    setCustomDescription('');
    setCustomInstructions('');
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-100">Agentes Especializados</h1>
          <button
            onClick={() => setIsCreatingModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-semibold hover:bg-cyan-500/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar Agente</span>
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Escolha um agente especialista ou deixe o Superagente coordenar toda a equipe.
        </p>
      </div>

      {/* Filter Tabs (matching mockup) */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
        {(['todos', 'superagente', 'autonomos', 'especialistas'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`flex-1 py-1.5 rounded-lg font-medium capitalize transition-all ${
              filterTab === tab
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredAgents.map((agent) => {
          const IconComp = ICONS[agent.avatarIcon] || Cpu;

          return (
            <div
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className="holo-card p-3.5 rounded-2xl hover:holo-card-active transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center border"
                      style={{
                        backgroundColor: agent.colorScheme.bg,
                        borderColor: agent.colorScheme.border,
                        color: agent.colorScheme.text,
                      }}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-100">{agent.name}</h3>
                      <span className="text-[10px] text-slate-400">{agent.title}</span>
                    </div>
                  </div>

                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-2.5 line-clamp-2">
                  {agent.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="font-mono text-cyan-400 text-[10px] truncate max-w-[150px]">
                  {agent.model}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRunAgentDirectly(agent);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 flex items-center gap-1 text-[11px] font-semibold transition-colors"
                >
                  <Play className="w-3 h-3" />
                  <span>Acionar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Agent Inspector Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="w-full max-w-lg holo-card rounded-3xl p-5 border border-cyan-500/40 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border"
                  style={{
                    backgroundColor: selectedAgent.colorScheme.bg,
                    borderColor: selectedAgent.colorScheme.border,
                    color: selectedAgent.colorScheme.text,
                  }}
                >
                  {React.createElement(ICONS[selectedAgent.avatarIcon] || Cpu, { className: 'w-5 h-5' })}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">{selectedAgent.name}</h3>
                  <span className="text-xs text-slate-400">{selectedAgent.title}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedAgent(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-mono text-[11px] text-cyan-400 uppercase tracking-wider">Objetivo & Função</span>
                <p className="text-slate-200 mt-1 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  {selectedAgent.description}
                </p>
              </div>

              <div>
                <span className="font-mono text-[11px] text-cyan-400 uppercase tracking-wider">Instruções de Sistema</span>
                <p className="text-slate-300 mt-1 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px]">
                  {selectedAgent.instructions}
                </p>
              </div>

              <div>
                <span className="font-mono text-[11px] text-cyan-400 uppercase tracking-wider">Ferramentas Autorizadas</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {selectedAgent.allowedTools.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 font-mono text-[10px] border border-cyan-500/20"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Nível de Autonomia</div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">Nível {selectedAgent.autonomyLevel} / 5</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Motor de IA</div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5 font-mono truncate">{selectedAgent.model}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  onRunAgentDirectly(selectedAgent);
                  setSelectedAgent(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold hover:brightness-110 flex items-center justify-center gap-2 text-xs transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Iniciar Conversa com este Agente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Agent Modal */}
      {isCreatingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <form onSubmit={handleCreateCustom} className="w-full max-w-lg holo-card rounded-3xl p-5 border border-cyan-500/40 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Configurar Novo Agente Personalizado
              </h2>
              <button
                type="button"
                onClick={() => setIsCreatingModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Nome do Agente</label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ex: Agente Financeiro, Agente de Marketing..."
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Título / Função</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Ex: Análise de balanços e planilhas"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Breve resumo da atribuição do agente..."
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Instruções de Comportamento (Prompt do Agente)</label>
                <textarea
                  rows={3}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Defina o papel e critérios de sucesso..."
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:border-cyan-400 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-bold hover:brightness-110 flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar Agente</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

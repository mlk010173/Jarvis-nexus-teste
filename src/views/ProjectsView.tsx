import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  StopCircle,
  FileCode,
  Terminal,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ExecutionPlan } from '../core/orchestrator/types.ts';
import { NexusOrchestrator } from '../core/orchestrator/orchestrator.ts';

interface ProjectsViewProps {
  currentPlan: ExecutionPlan | null;
  onUpdatePlan: (plan: ExecutionPlan) => void;
  onNavigateToCode: () => void;
}

interface ProjectItem {
  id: string;
  title: string;
  createdBy: string;
  status: 'em_andamento' | 'concluido';
  progressPercent: number;
  description: string;
  steps: { title: string; done: boolean; agent: string }[];
  termuxCommand?: string;
}

const DEFAULT_PROJECTS: ProjectItem[] = [
  {
    id: 'proj-1',
    title: 'App To-Do List',
    createdBy: 'Superagente',
    status: 'em_andamento',
    progressPercent: 75,
    description: 'Aplicativo de tarefas com interface moderna responsiva e deploy via Termux no celular.',
    steps: [
      { title: 'Buscar repositório base', done: true, agent: 'Agente de Código' },
      { title: 'Adaptar o código', done: true, agent: 'Agente de Código' },
      { title: 'Criar interface com Magic UI', done: true, agent: 'Agente de UI/UX' },
      { title: 'Configurar deploy no celular', done: false, agent: 'Agente de Deploy' },
    ],
    termuxCommand: 'pkg install nodejs && git clone https://github.com/jarvis/todo-pwa && cd todo-pwa && npm run dev',
  },
  {
    id: 'proj-2',
    title: 'Assistente de Estudos com IA',
    createdBy: 'Agente Autônomo',
    status: 'concluido',
    progressPercent: 100,
    description: 'App para organizar estudos com IA, notificações e modo foco.',
    steps: [
      { title: 'Mapear grade curricular', done: true, agent: 'Agente de Pesquisa' },
      { title: 'Criar banco vetorial de resumos', done: true, agent: 'Agente de Memória' },
      { title: 'Interface PWA para mobile', done: true, agent: 'Agente de UI/UX' },
    ],
  },
  {
    id: 'proj-3',
    title: 'Crawler de Repositórios Open-Source',
    createdBy: 'Agente de Pesquisa',
    status: 'concluido',
    progressPercent: 100,
    description: 'Indexador automático de bibliotecas de ponta no GitHub (Magic UI, Astra, Shadcn, Supabase).',
    steps: [
      { title: 'Scraping de repositórios em alta', done: true, agent: 'Agente de Pesquisa' },
      { title: 'Filtragem por licença permissiva MIT', done: true, agent: 'Agente de Segurança' },
      { title: 'Indexação na base local', done: true, agent: 'Agente de Dados' },
    ],
  },
];

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  currentPlan,
  onUpdatePlan,
}) => {
  const [filterTab, setFilterTab] = useState<'ativos' | 'concluidos' | 'todos'>('ativos');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>('proj-1');
  const [isExecutingStep, setIsExecutingStep] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const filteredProjects = DEFAULT_PROJECTS.filter((p) => {
    if (filterTab === 'ativos') return p.status === 'em_andamento';
    if (filterTab === 'concluidos') return p.status === 'concluido';
    return true;
  });

  const handleRunNextPlanStep = async () => {
    if (!currentPlan) return;
    const nextIndex = currentPlan.subtasks.findIndex((s) => s.status === 'pending');
    if (nextIndex === -1) return;

    setIsExecutingStep(true);
    try {
      const updated = await NexusOrchestrator.runPlanStep(currentPlan, nextIndex);
      onUpdatePlan(updated);
    } finally {
      setIsExecutingStep(false);
    }
  };

  const copyTermuxCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Meus Projetos & Tarefas</h1>
        <p className="text-xs text-slate-400 mt-1">
          Acompanhe os planos de execução elaborados pelo Superagente e seus subagentes.
        </p>
      </div>

      {/* Filter Tabs (matching mockup) */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
        {(['ativos', 'concluidos', 'todos'] as const).map((tab) => (
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

      {/* Active Dynamic Plan (if created in Chat) */}
      {currentPlan && (
        <div className="holo-card p-4 rounded-2xl border border-cyan-400/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-mono uppercase text-cyan-400 tracking-wider">
                Execução Dinâmica Ativa
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-300">
              {currentPlan.progressPercent}%
            </span>
          </div>

          <h3 className="text-sm font-bold text-slate-100">{currentPlan.goal}</h3>

          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
              style={{ width: `${currentPlan.progressPercent}%` }}
            />
          </div>

          {/* Subtasks List */}
          <div className="space-y-2 pt-1 text-xs">
            {currentPlan.subtasks.map((step, idx) => (
              <div
                key={step.id}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  {step.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : step.status === 'in_progress' ? (
                    <Clock className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0 flex items-center justify-center text-[9px] text-slate-500">
                      {idx + 1}
                    </div>
                  )}

                  <div>
                    <div className="font-semibold text-slate-200">{step.title}</div>
                    <div className="text-[10px] text-slate-400">{step.description}</div>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-cyan-400 shrink-0">
                  {step.assignedAgentId.replace('-agent', '')}
                </span>
              </div>
            ))}
          </div>

          {currentPlan.status !== 'completed' && (
            <button
              onClick={handleRunNextPlanStep}
              disabled={isExecutingStep}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs hover:brightness-110 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isExecutingStep ? 'Executando etapa...' : 'Executar Próxima Etapa do Plano'}</span>
            </button>
          )}
        </div>
      )}

      {/* Projects List matching user mockup */}
      <div className="space-y-3">
        {filteredProjects.map((project) => {
          const isExpanded = expandedProjectId === project.id;

          return (
            <div
              key={project.id}
              className="holo-card p-4 rounded-2xl transition-all"
            >
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                    <Cpu className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{project.title}</h3>
                    <span className="text-[11px] text-slate-400">Criado por: {project.createdBy}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      project.status === 'concluido'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                    }`}
                  >
                    {project.status === 'concluido' ? 'Concluído' : 'Em andamento'}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                  <span>Progresso</span>
                  <span className="text-cyan-400 font-bold">{project.progressPercent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${project.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Expanded Checklist */}
              {isExpanded && (
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 text-xs">
                  <p className="text-slate-300 text-xs mb-2">{project.description}</p>

                  <div className="space-y-1.5">
                    {project.steps.map((st, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1">
                        <div className="flex items-center gap-2">
                          {st.done ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />
                          )}
                          <span className={st.done ? 'text-slate-200' : 'text-slate-400'}>
                            {st.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-cyan-400">{st.agent}</span>
                      </div>
                    ))}
                  </div>

                  {project.termuxCommand && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px]">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Terminal className="w-3 h-3" />
                          Execução no Celular (Android Termux)
                        </span>
                        <button
                          onClick={() => copyTermuxCmd(project.termuxCommand!)}
                          className="text-cyan-300 hover:underline"
                        >
                          {copiedCmd ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                      <div className="text-slate-300 break-all">{project.termuxCommand}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

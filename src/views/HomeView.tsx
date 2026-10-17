import React, { useState } from 'react';
import type { ExecutionPlan } from '../core/orchestrator/types.ts';
import { HolographicCore } from '../components/HolographicCore.tsx';
import {
  MessageSquare,
  Users,
  FolderGit2,
  Settings,
  Mic,
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  ExternalLink,
  Wand2,
  Smartphone,
} from 'lucide-react';

interface HomeViewProps {
  onNavigate: (tab: string) => void;
  onSendGoal?: (goal: string) => void;
  onStartVoice?: () => void;
  isListening?: boolean;
  activeProvider?: string;
  onSendMessage?: (text: string) => void;
  onToggleVoice?: () => void;
  currentPlan?: ExecutionPlan | null;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onSendGoal,
  onStartVoice,
  isListening,
  activeProvider,
}) => {
  const [goalInput, setGoalInput] = useState('');

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalInput.trim()) return;
    onSendGoal?.(goalInput);
    setGoalInput('');
  };

  const samplePrompts = [
    'Criar app de lista de tarefas com interface moderna e rodar no celular',
    'Pesquisar componentes animados do Magic UI para React',
    'Configurar deploy do projeto via Termux Android',
    'Explicar arquitetura multiagente com LangGraph e CrewAI',
  ];

  return (
    <div className="space-y-6 pb-24">
      {/* Hero Hologram Section */}
      <div className="flex flex-col items-center text-center pt-2">
        <HolographicCore
          state={isListening ? 'listening' : 'idle'}
          size="md"
          onClick={() => onStartVoice?.()}
        />

        <div className="mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs font-mono text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>JARVIS NEXUS // 100% OPEN-SOURCE</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-sky-400">
            Seu Superagente de IA no Celular
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Multiagentes • Autônomo • Modular • IA Real sem limites
          </p>
        </div>
      </div>

      {/* Main Command Input */}
      <form onSubmit={handleQuickSubmit} className="relative">
        <div className="relative flex items-center bg-slate-900/90 rounded-2xl border border-cyan-500/30 focus-within:border-cyan-400 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all overflow-hidden p-1.5">
          <button
            type="button"
            onClick={() => onStartVoice?.()}
            aria-label="Ativar comando por voz"
            className={`p-3 rounded-xl transition-all ${
              isListening
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_#06b6d4]'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800'
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            placeholder="Digite sua solicitação ou objetivo..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!goalInput.trim()}
            aria-label="Enviar comando para o Superagente"
            className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Suggestion Chips */}
        <div className="flex gap-2 overflow-x-auto pt-2 pb-1 no-scrollbar">
          {samplePrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSendGoal?.(prompt)}
              className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-colors"
            >
              <Sparkles className="w-3 h-3 inline mr-1 text-cyan-400" />
              {prompt}
            </button>
          ))}
        </div>
      </form>

      {/* Quick Power Tools: Prompt Forge & Mobile Sandbox */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => onNavigate('prompt-forge')}
          className="p-3 rounded-2xl bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border border-cyan-500/40 hover:border-cyan-400 text-left flex items-center gap-2.5 transition-all shadow-lg shadow-cyan-950/40 group"
        >
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
            <Wand2 className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-100 flex items-center gap-1">
              <span>Prompt Forge</span>
              <Sparkles className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="text-[10px] text-cyan-300/80">Gerar & Rodar</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('sandbox')}
          className="p-3 rounded-2xl bg-gradient-to-r from-pink-950/80 to-purple-950/80 border border-pink-500/40 hover:border-pink-400 text-left flex items-center gap-2.5 transition-all shadow-lg shadow-pink-950/40 group"
        >
          <div className="w-9 h-9 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
            <Smartphone className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-100">Sandbox Mobile</div>
            <div className="text-[10px] text-pink-300/80">Executar no Celular</div>
          </div>
        </button>
      </div>

      {/* 4 Primary Navigation Cards (from reference image) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('chat')}
          className="holo-card p-4 rounded-2xl text-left hover:holo-card-active transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="mt-3">
            <h2 className="text-sm font-bold text-slate-100">Conversar</h2>
            <p className="text-[11px] text-slate-400">Diálogo inteligente e comandos</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('agents')}
          className="holo-card p-4 rounded-2xl text-left hover:holo-card-active transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div className="mt-3">
            <h2 className="text-sm font-bold text-slate-100">Agentes</h2>
            <p className="text-[11px] text-slate-400">12 especialistas autônomos</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('repositories')}
          className="holo-card p-4 rounded-2xl text-left hover:holo-card-active transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div className="mt-3">
            <h2 className="text-sm font-bold text-slate-100">Repositórios</h2>
            <p className="text-[11px] text-slate-400">Magic UI, Flutter, Supabase</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('settings')}
          className="holo-card p-4 rounded-2xl text-left hover:holo-card-active transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
            <Settings className="w-5 h-5" />
          </div>
          <div className="mt-3">
            <h2 className="text-sm font-bold text-slate-100">Configurações</h2>
            <p className="text-[11px] text-slate-400">Autonomia, voz e segurança</p>
          </div>
        </button>
      </div>

      {/* Active Project Card (directly matches Screen 4 from Mockup) */}
      <div className="holo-card rounded-2xl p-4 border border-cyan-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider">Projeto Atual</span>
              <h3 className="text-sm font-bold text-slate-100">App To-Do List</h3>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px] font-semibold">
            Em andamento
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
            <span>Progresso da equipe</span>
            <span className="text-cyan-400 font-bold">75%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: '75%' }}
            />
          </div>
        </div>

        {/* Steps Checklist */}
        <div className="mt-3 space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="text-slate-300">Buscar repositório base open-source</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="text-slate-300">Adaptar o código e regras de negócio</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="text-slate-300">Criar interface com Magic UI</span>
          </div>
          <div className="flex items-center gap-2 text-cyan-300">
            <Clock className="w-3.5 h-3.5 shrink-0 animate-spin text-cyan-400" />
            <span className="text-cyan-200">Configurar deploy no celular via Termux</span>
          </div>
        </div>

        <button
          onClick={() => onNavigate('projects')}
          className="mt-4 w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 border border-cyan-500/20 flex items-center justify-center gap-2 transition-all"
        >
          <span>Ver detalhes do projeto</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Multi-Agent Architecture Overview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Equipe de Agentes Especializados
          </h2>
          <button
            onClick={() => onNavigate('agents')}
            className="text-xs text-cyan-400 hover:underline"
          >
            Ver todos (12)
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <div>
              <div className="font-semibold text-slate-200">Agente de Código</div>
              <div className="text-[10px] text-slate-400">Repositórios & TypeScript</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-pink-400" />
            <div>
              <div className="font-semibold text-slate-200">Agente de UI/UX</div>
              <div className="text-[10px] text-slate-400">Magic UI & Mobile-First</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <div>
              <div className="font-semibold text-slate-200">Agente de Pesquisa</div>
              <div className="text-[10px] text-slate-400">Web & Fontes Oficiais</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <div>
              <div className="font-semibold text-slate-200">Agente de Deploy</div>
              <div className="text-[10px] text-slate-400">Termux, Docker, PWA</div>
            </div>
          </div>
        </div>
      </div>

      {/* Online & System Status Bar */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/20 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-medium">JARVIS está online</span>
        </div>
        <div className="text-[11px] font-mono text-cyan-400">
          Provedor: {activeProvider}
        </div>
      </div>
    </div>
  );
};

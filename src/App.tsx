/**
 * JARVIS NEXUS - Main Application Shell
 * Multi-Agent Autonomous Superagent for Mobile & Web
 */

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
  Home,
  MessageSquare,
  Users,
  FolderKanban,
  FolderGit2,
  Menu,
  X,
  Volume2,
  VolumeX,
  Shield,
  Wrench,
  Database,
  Cpu,
  Settings,
  AlertCircle,
  StopCircle,
  Wand2,
  Smartphone,
  Download,
} from 'lucide-react';

// Lazy-loaded views for code splitting and instant initial loading
const HomeView = lazy(() => import('./views/HomeView.tsx').then((m) => ({ default: m.HomeView })));
const ChatView = lazy(() => import('./views/ChatView.tsx').then((m) => ({ default: m.ChatView })));
const AgentsView = lazy(() => import('./views/AgentsView.tsx').then((m) => ({ default: m.AgentsView })));
const ProjectsView = lazy(() => import('./views/ProjectsView.tsx').then((m) => ({ default: m.ProjectsView })));
const RepositoriesView = lazy(() => import('./views/RepositoriesView.tsx').then((m) => ({ default: m.RepositoriesView })));
const MemoryView = lazy(() => import('./views/MemoryView.tsx').then((m) => ({ default: m.MemoryView })));
const ToolsView = lazy(() => import('./views/ToolsView.tsx').then((m) => ({ default: m.ToolsView })));
const ProvidersView = lazy(() => import('./views/ProvidersView.tsx').then((m) => ({ default: m.ProvidersView })));
const SettingsView = lazy(() => import('./views/SettingsView.tsx').then((m) => ({ default: m.SettingsView })));
const PromptForgeView = lazy(() => import('./views/PromptForgeView.tsx').then((m) => ({ default: m.PromptForgeView })));
const SandboxView = lazy(() => import('./views/SandboxView.tsx').then((m) => ({ default: m.SandboxView })));
const McpView = lazy(() => import('./views/McpView.tsx').then((m) => ({ default: m.McpView })));

import { ViewSkeleton } from './components/ViewSkeleton.tsx';
import { useToast } from './components/Toast.tsx';
import { INITIAL_AGENTS } from './core/orchestrator/agents-registry.ts';
import { AgentProfile, ChatMessage, ExecutionPlan, AutonomyLevel } from './core/orchestrator/types.ts';
import { NexusOrchestrator } from './core/orchestrator/orchestrator.ts';
import { StorageService, JarvisBackupBundle } from './core/storage/storage-service.ts';
import { useVoice } from './hooks/useVoice.ts';
import { useSoundEffects } from './hooks/useSoundEffects.ts';
import { usePWAInstall } from './hooks/usePWAInstall.ts';

const INITIAL_GREETING_MESSAGE: ChatMessage = {
  id: 'msg-init-1',
  role: 'assistant',
  agentName: 'JARVIS (Superagente Ativo)',
  content:
    'Olá! Eu sou o JARVIS, seu superagente autônomo no celular. Posso coordenar vários agentes especializados, acessar repositórios open-source, criar projetos e muito mais. O que você quer fazer hoje?',
  timestamp: Date.now() - 3600000,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Persistent States
  const [agents, setAgents] = useState<AgentProfile[]>(INITIAL_AGENTS);
  const [currentPlan, setCurrentPlan] = useState<ExecutionPlan | null>(() => StorageService.loadPlan());
  const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>(() => StorageService.loadAutonomy(4));
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(() => StorageService.loadTheme('dark'));
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    StorageService.loadMessages([INITIAL_GREETING_MESSAGE])
  );

  const [isLoading, setIsLoading] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(true);
  const [activeProviderId, setActiveProviderId] = useState<string>(() => StorageService.loadProvider('local-heuristic'));
  const [activeModel, setActiveModel] = useState<string>(() => StorageService.loadModel(''));
  const [activeProvider, setActiveProvider] = useState('JARVIS Local Heuristic Engine');
  const [isOnline, setIsOnline] = useState(true);

  const { showToast } = useToast();
  const { playChirp, playSuccess } = useSoundEffects();
  const { isInstallable, install: installPwa } = usePWAInstall();

  // Save messages whenever they change
  useEffect(() => {
    StorageService.saveMessages(messages);
  }, [messages]);

  // Save plan whenever it changes
  useEffect(() => {
    StorageService.savePlan(currentPlan);
  }, [currentPlan]);

  // Save autonomy level whenever it changes
  useEffect(() => {
    StorageService.saveAutonomy(autonomyLevel);
  }, [autonomyLevel]);

  // Apply Theme & Listen to system preference
  const applyTheme = useCallback((targetTheme: 'dark' | 'light' | 'system') => {
    setTheme(targetTheme);
    StorageService.saveTheme(targetTheme);

    const isDark =
      targetTheme === 'system'
        ? typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
        : targetTheme === 'dark';

    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme, applyTheme]);

  // Voice Hook
  const handleVoiceTranscript = (transcript: string) => {
    handleSendMessage(transcript);
  };

  const {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
  } = useVoice(handleVoiceTranscript);

  // Check health and connectivity on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setHasGeminiKey(data.hasGeminiKey);
          if (!data.hasGeminiKey) {
            setActiveProvider('JARVIS Heuristic Engine (Local)');
          }
        }
      } catch {
        setHasGeminiKey(false);
        setActiveProvider('JARVIS Heuristic Engine (Local)');
      }
    };
    checkHealth();

    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  // Keyboard navigation: Escape key closes "Mais" drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMoreMenuOpen) {
        setIsMoreMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMoreMenuOpen]);

  // Send message and invoke orchestrator
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    playChirp();

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const lower = text.toLowerCase();
      const isProjectGoal =
        lower.includes('criar') ||
        lower.includes('construir') ||
        lower.includes('desenvolver') ||
        lower.includes('fazer um app') ||
        lower.includes('projeto') ||
        lower.includes('todo list');

      if (isProjectGoal) {
        // Decompose goal with Nexus Orchestrator
        const plan = NexusOrchestrator.createPlan(text, autonomyLevel);
        setCurrentPlan(plan);
        showToast('Novo plano estruturado pelo Nexus Orchestrator!', 'success');

        let assistantContent = `Iniciei o plano de decomposição da meta: "${text}".\n\n`;
        assistantContent += `Organizei ${plan.subtasks.length} subtarefas entre os agentes de Pesquisa, Código, UI/UX e Deploy.\n`;
        assistantContent += `Você pode acompanhar o progresso em tempo real na aba "Projetos".`;

        // If backend API is reachable, request summary
        try {
          const planRes = await fetch('/api/orchestrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal: text, autonomyLevel }),
          });
          if (planRes.ok) {
            const data = await planRes.json();
            if (data.plan?.finalResult) {
              assistantContent = data.plan.finalResult;
            }
          }
        } catch {
          // Graceful local continuation
        }

        const assistantMsg: ChatMessage = {
          id: `msg-asst-${Date.now()}`,
          role: 'assistant',
          agentName: 'NEXUS ORCHESTRATOR',
          content: assistantContent,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        speak(assistantContent);
        playSuccess();
        return;
      }

      // Regular Chat Request
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          agentId: 'nexus-orchestrator',
          history: messages.slice(-5),
          providerId: activeProviderId,
          model: activeModel,
        }),
      });

      if (!chatRes.ok) {
        if (chatRes.status === 429) {
          throw new Error('Limite de mensagens temporariamente atingido. Aguarde alguns instantes.');
        }
        throw new Error(`Erro na comunicação com o servidor (${chatRes.status})`);
      }

      const chatData = await chatRes.json();

      const replyMsg: ChatMessage = {
        id: `msg-asst-${Date.now()}`,
        role: 'assistant',
        agentName: chatData.agentName || 'JARVIS NEXUS',
        content: chatData.response,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, replyMsg]);
      speak(chatData.response);
      playSuccess();
    } catch (err: any) {
      const errorMsgText = err.message || 'Falha ao processar solicitação. Operando em modo de recuperação.';
      showToast(errorMsgText, 'error');

      const fallbackMsg: ChatMessage = {
        id: `msg-fallback-${Date.now()}`,
        role: 'assistant',
        agentName: 'JARVIS (Proteção Local)',
        content: `Aviso do Sistema: ${errorMsgText}\n\nO JARVIS ativou o modo autônomo offline para preservar suas operações sem perda de continuidade.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdoptRepo = (repoName: string, category: string) => {
    setActiveTab('projects');
    showToast(`Repositório ${repoName} adotado no plano atual!`, 'success');
    const newGoal = `Integrar biblioteca ${repoName} (${category}) ao aplicativo mobile`;
    const plan = NexusOrchestrator.createPlan(newGoal, autonomyLevel);
    setCurrentPlan(plan);
  };

  const handleRestoreBackup = (bundle: JarvisBackupBundle) => {
    setMessages(bundle.messages);
    setCurrentPlan(bundle.currentPlan);
    setAutonomyLevel(bundle.autonomyLevel);
    applyTheme(bundle.theme);
    showToast('Ecossistema JARVIS restaurado com sucesso!', 'success');
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans transition-colors duration-300">
      {/* Top HUD Status Bar */}
      <header
        role="banner"
        className="sticky top-0 z-40 bg-[#030712]/90 backdrop-blur-md border-b border-cyan-500/20 px-3.5 py-2.5 flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 group text-left focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-lg p-0.5"
            aria-label="Ir para a tela inicial do JARVIS NEXUS"
          >
            <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-black tracking-wider uppercase bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
                JARVIS NEXUS
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>ONLINE • NÍVEL {autonomyLevel}</span>
              </div>
            </div>
          </button>
        </div>

        {/* Status Indicators & Voice Controls */}
        <div className="flex items-center gap-1.5">
          {/* PWA Install Button */}
          {isInstallable && (
            <button
              onClick={installPwa}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/30 transition-all focus:ring-2 focus:ring-cyan-400 focus:outline-none"
              aria-label="Instalar JARVIS como aplicativo no celular"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Instalar</span>
            </button>
          )}

          {/* Voice Listening indicator */}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`p-2 rounded-xl border transition-all focus:ring-2 focus:ring-cyan-400 focus:outline-none ${
              isListening
                ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-cyan-400'
            }`}
            aria-label={isListening ? 'Parar microfone' : 'Ativar comando de voz'}
          >
            {isListening ? (
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
              </span>
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          {/* Speaking Audio Cancel */}
          {isSpeaking && (
            <button
              onClick={cancelSpeech}
              className="p-2 rounded-xl bg-amber-500/20 border border-amber-500 text-amber-300 hover:bg-amber-500/30 transition-all focus:ring-2 focus:ring-amber-400 focus:outline-none"
              aria-label="Silenciar fala do assistente"
            >
              <VolumeX className="w-4 h-4" />
            </button>
          )}

          {/* Autonomy Level Badge */}
          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-[11px] font-mono text-cyan-400 transition-colors focus:ring-2 focus:ring-cyan-400 focus:outline-none"
            aria-label={`Nível de Autonomia ${autonomyLevel}. Clique para alterar.`}
          >
            <Shield className="w-3 h-3 text-cyan-400" />
            <span>L{autonomyLevel}</span>
          </button>
        </div>
      </header>

      {/* Main View Area with Suspense and Code-Splitting */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5" role="main">
        <Suspense fallback={<ViewSkeleton label={`Carregando módulo ${activeTab}...`} />}>
          {activeTab === 'home' && (
            <HomeView
              onNavigate={(tab) => setActiveTab(tab)}
              onSendGoal={handleSendMessage}
              onStartVoice={isListening ? stopListening : startListening}
              onSendMessage={handleSendMessage}
              isListening={isListening}
              onToggleVoice={isListening ? stopListening : startListening}
              activeProvider={activeProvider}
              currentPlan={currentPlan}
            />
          )}

          {activeTab === 'chat' && (
            <ChatView
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              isListening={isListening}
              onToggleVoice={isListening ? stopListening : startListening}
              activePlan={currentPlan}
              onNavigateToProjects={() => setActiveTab('projects')}
              autonomyLevel={autonomyLevel}
              onClearChat={() => {
                setMessages([INITIAL_GREETING_MESSAGE]);
                StorageService.saveMessages([INITIAL_GREETING_MESSAGE]);
                showToast('Histórico de conversa reiniciado.', 'info');
              }}
            />
          )}

          {activeTab === 'agents' && (
            <AgentsView
              agents={agents}
              onSelectAgent={(ag) => {
                setActiveTab('chat');
                handleSendMessage(`Ativar agente especialista: ${ag.name}`);
              }}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsView
              currentPlan={currentPlan}
              onUpdatePlan={setCurrentPlan}
              onNavigateToCode={() => setActiveTab('repositories')}
            />
          )}

          {activeTab === 'repositories' && (
            <RepositoriesView onAdoptRepo={handleAdoptRepo} />
          )}

          {activeTab === 'memory' && <MemoryView />}

          {activeTab === 'tools' && <ToolsView />}

          {activeTab === 'providers' && (
            <ProvidersView
              activeProviderId={activeProviderId}
              activeModel={activeModel}
              onSelectProvider={(providerId, model) => {
                setActiveProviderId(providerId);
                setActiveModel(model);
                StorageService.saveProvider(providerId);
                StorageService.saveModel(model);
                showToast(`Provedor ativo: ${providerId} (${model})`, 'success');
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              autonomyLevel={autonomyLevel}
              onUpdateAutonomyLevel={setAutonomyLevel}
              theme={theme}
              onUpdateTheme={applyTheme}
              onRestoreBackup={handleRestoreBackup}
            />
          )}

          {activeTab === 'prompt-forge' && (
            <PromptForgeView
              onRunGeneratedPrompt={(prompt) => {
                setActiveTab('chat');
                handleSendMessage(prompt);
              }}
            />
          )}

          {activeTab === 'sandbox' && <SandboxView />}

          {activeTab === 'mcp' && <McpView />}
        </Suspense>
      </main>

      {/* Fixed Bottom Tab Bar for Mobile Ergonomics (Min 48px hitboxes) */}
      <nav
        role="tablist"
        aria-label="Navegação Principal do Aplicativo"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#030712]/95 backdrop-blur-md border-t border-cyan-500/20 px-2 py-1 max-w-md sm:max-w-xl mx-auto"
      >
        <div className="grid grid-cols-5 items-center">
          <button
            role="tab"
            aria-selected={activeTab === 'home'}
            aria-label="Início"
            onClick={() => setActiveTab('home')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition-colors focus:ring-2 focus:ring-cyan-400 focus:outline-none rounded-lg ${
              activeTab === 'home' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-1">Início</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'chat'}
            aria-label="Chat com Superagente"
            onClick={() => setActiveTab('chat')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition-colors focus:ring-2 focus:ring-cyan-400 focus:outline-none rounded-lg ${
              activeTab === 'chat' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] mt-1">Chat</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'agents'}
            aria-label="12 Agentes Especializados"
            onClick={() => setActiveTab('agents')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition-colors focus:ring-2 focus:ring-cyan-400 focus:outline-none rounded-lg ${
              activeTab === 'agents' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-1">Agentes</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'projects'}
            aria-label="Projetos e Planos de Execução"
            onClick={() => setActiveTab('projects')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition-colors focus:ring-2 focus:ring-cyan-400 focus:outline-none rounded-lg ${
              activeTab === 'projects' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderKanban className="w-5 h-5" />
            <span className="text-[10px] mt-1">Projetos</span>
          </button>

          <button
            role="tab"
            aria-selected={['repositories', 'memory', 'tools', 'providers', 'settings', 'prompt-forge', 'sandbox', 'mcp'].includes(activeTab)}
            aria-label="Mais recursos e ferramentas"
            aria-haspopup="dialog"
            aria-expanded={isMoreMenuOpen}
            onClick={() => setIsMoreMenuOpen(true)}
            className={`min-h-[48px] flex flex-col items-center justify-center transition-colors focus:ring-2 focus:ring-cyan-400 focus:outline-none rounded-lg ${
              ['repositories', 'memory', 'tools', 'providers', 'settings', 'prompt-forge', 'sandbox', 'mcp'].includes(activeTab)
                ? 'text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] mt-1">Mais</span>
          </button>
        </div>
      </nav>

      {/* Drawer / Action Sheet for "Mais" Options */}
      {isMoreMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu de Recursos Adicionais"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-3 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md holo-card rounded-3xl p-5 border border-cyan-500/40 space-y-3 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-mono uppercase text-cyan-400 tracking-wider">
                Recursos do JARVIS NEXUS
              </span>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                aria-label="Fechar menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => {
                  setActiveTab('prompt-forge');
                  setIsMoreMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-left flex items-center gap-2.5 transition-colors focus:ring-2 focus:ring-cyan-400 focus:outline-none"
              >
                <Wand2 className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="font-semibold text-slate-100">Prompt Forge</div>
                  <div className="text-[10px] text-slate-400">Super-Prompts & IA</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('sandbox');
                  setIsMoreMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-left flex items-center gap-2.5 transition-colors focus:ring-2 focus:ring-cyan-400 focus:outline-none"
              >
                <Smartphone className="w-4 h-4 text-pink-400" />
                <div>
                  <div className="font-semibold text-slate-100">Sandbox Mobile</div>
                  <div className="text-[10px] text-slate-400">Executar Apps no Celular</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('mcp');
                  setIsMoreMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-left flex items-center gap-2.5 transition-colors focus:ring-2 focus:ring-cyan-400 focus:outline-none"
              >
                <Cpu className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold text-slate-100">Protocolo MCP</div>
                  <div className="text-[10px] text-slate-400">5 Servidores Conectados</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('repositories');
                  setIsMoreMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-left flex items-center gap-2.5 transition-colors focus:ring-2 focus:ring-cyan-400 focus:outline-none"
              >
                <FolderGit2 className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="font-semibold text-slate-100">Repositórios</div>
                  <div className="text-[10px] text-slate-400">Magic UI, Flutter</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('memory');
                  setIsMoreMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-left flex items-center gap-2.5 transition-colors focus:ring-2 focus:ring-cyan-400 focus:outline-none"
              >
                <Database className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="font-semibold text-slate-100">Memória</div>
                  <div className="text-[10px] text-slate-400">Base de Conhecimento</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('tools');
                  setIsMoreMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-left flex items-center gap-2.5 transition-colors focus:ring-2 focus:ring-cyan-400 focus:outline-none"
              >
                <Wrench className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="font-semibold text-slate-100">Ferramentas</div>
                  <div className="text-[10px] text-slate-400">10 Plugins Ativos</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('providers');
                  setIsMoreMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-left flex items-center gap-2.5 transition-colors focus:ring-2 focus:ring-cyan-400 focus:outline-none"
              >
                <Cpu className="w-4 h-4 text-sky-400" />
                <div>
                  <div className="font-semibold text-slate-100">Provedores IA</div>
                  <div className="text-[10px] text-slate-400">Gemini, Ollama, Local</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('settings');
                  setIsMoreMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-left flex items-center gap-2.5 transition-colors focus:ring-2 focus:ring-cyan-400 focus:outline-none"
              >
                <Settings className="w-4 h-4 text-slate-300" />
                <div>
                  <div className="font-semibold text-slate-100">Configurações</div>
                  <div className="text-[10px] text-slate-400">Níveis & Backups</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Send,
  Sparkles,
  Bot,
  User,
  ShieldAlert,
  Check,
  X,
  Volume2,
  VolumeX,
  Copy,
  ArrowUpRight,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { ChatMessage, ExecutionPlan } from '../core/orchestrator/types.ts';

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  isListening: boolean;
  onToggleVoiceInput: () => void;
  onSpeak: (text: string) => void;
  onCancelSpeech: () => void;
  isSpeaking: boolean;
  activePlan: ExecutionPlan | null;
  onNavigateToProjects: () => void;
  onClearChat: () => void;
  onApproveAction: (actionId: string) => void;
  onRejectAction: (actionId: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  isLoading,
  isListening,
  onToggleVoiceInput,
  onSpeak,
  onCancelSpeech,
  isSpeaking,
  activePlan,
  onNavigateToProjects,
  onClearChat,
  onApproveAction,
  onRejectAction,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const msg = inputText;
    setInputText('');
    await onSendMessage(msg);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] pb-20">
      {/* Top Chat Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              JARVIS NEXUS
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </h2>
            <span className="text-[10px] text-slate-400 font-mono">Superagente Ativo</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSpeaking ? (
            <button
              onClick={onCancelSpeech}
              title="Silenciar voz"
              className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
            >
              <VolumeX className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
                if (lastAssistant) onSpeak(lastAssistant.content);
              }}
              title="Ouvir última resposta"
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onClearChat}
            title="Limpar histórico"
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none shadow-md'
                    : 'holo-card border border-cyan-500/20 text-slate-200 rounded-tl-none'
                }`}
              >
                {!isUser && msg.agentName && (
                  <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 mb-1.5 pb-1 border-b border-slate-800">
                    <span className="font-semibold">{msg.agentName}</span>
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="text-slate-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )}

                {/* Content rendered with line breaks */}
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Plan Preview Banner if associated */}
                {msg.planPreview && (
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/30">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-cyan-300">
                      <span>Plano de Execução Criado</span>
                      <span className="font-mono">{msg.planPreview.progressPercent}%</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {msg.planPreview.subtasks.length} subtarefas coordenadas
                    </div>
                    <button
                      onClick={onNavigateToProjects}
                      className="mt-2 text-[11px] text-cyan-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <span>Acompanhar progresso detalhado</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0 mt-1">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading / Thinking Indicator */}
        {isLoading && (
          <div className="flex gap-2.5 items-center text-xs text-cyan-400 font-mono animate-pulse">
            <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            </div>
            <span>Superagente orquestrando subagentes e ferramentas...</span>
          </div>
        )}

        {/* Human-in-the-loop Approval Banner */}
        {activePlan && activePlan.status === 'waiting_approval' && activePlan.pendingApprovalAction && (
          <div className="p-3.5 rounded-2xl bg-amber-950/70 border border-amber-500/50 text-amber-200 text-xs">
            <div className="flex items-center gap-2 font-bold mb-1">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Autorização de Segurança Necessária</span>
            </div>
            <p className="text-[11px] text-amber-300/90 mb-3">
              {activePlan.pendingApprovalAction.description}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onApproveAction(activePlan.pendingApprovalAction!.subtaskId)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aprovar Execução</span>
              </button>
              <button
                onClick={() => onRejectAction(activePlan.pendingApprovalAction!.subtaskId)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-200 font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Rejeitar</span>
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="pt-2">
        <div className="relative flex items-center bg-slate-900 rounded-2xl border border-cyan-500/30 focus-within:border-cyan-400 focus-within:shadow-[0_0_15px_rgba(6,182,212,0.25)] p-1.5 transition-all">
          <button
            type="button"
            onClick={onToggleVoiceInput}
            aria-label="Gravar voz"
            className={`p-3 rounded-xl transition-all ${
              isListening
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_#06b6d4]'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isListening ? 'Ouvindo sua voz...' : 'Digite sua solicitação...'}
            disabled={isLoading}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            aria-label="Enviar mensagem"
            className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

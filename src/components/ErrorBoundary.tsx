import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, ShieldAlert } from 'lucide-react';
import { StorageService } from '../core/storage/storage-service.ts';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[JARVIS Crash Guard] Erro capturado pelo subsistema de interface:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleHardReset = () => {
    if (confirm('Tem certeza que deseja restaurar as configurações padrão? Isso limpará dados corrompidos.')) {
      StorageService.clearAll();
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen bg-[#030712] text-zinc-100 flex items-center justify-center p-4 font-sans"
        >
          <div className="max-w-lg w-full bg-zinc-900/90 border border-red-500/40 rounded-2xl p-6 shadow-2xl shadow-red-950/40 backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-red-500/20 pb-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                  <span>JARVIS CRASH GUARD</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300">
                    FALHA DE SUBSISTEMA
                  </span>
                </h1>
                <p className="text-xs text-zinc-400">
                  O protocolo de proteção do JARVIS isolou uma anomalia na interface para evitar perda de dados.
                </p>
              </div>
            </div>

            {/* Error Detail */}
            <div className="bg-black/60 border border-zinc-800 rounded-xl p-3 mb-5 font-mono text-xs text-red-300/90 max-h-40 overflow-y-auto">
              <div className="font-semibold text-zinc-400 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Mensagem de Erro:
              </div>
              <p className="break-words">
                {this.state.error?.message || 'Erro desconhecido na renderização da visualização.'}
              </p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={this.handleResetState}
                className="w-full py-2.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors focus:ring-2 focus:ring-cyan-400 focus:outline-none"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Recuperar Tela
              </button>
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors focus:ring-2 focus:ring-cyan-400 focus:outline-none"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Recarregar App
              </button>
              <button
                onClick={this.handleHardReset}
                className="w-full py-2.5 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/40 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors focus:ring-2 focus:ring-red-400 focus:outline-none"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

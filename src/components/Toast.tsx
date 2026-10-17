import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextType {
  showToast: (title: string, type?: ToastType, description?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (title: string, type: ToastType = 'info', description?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, title, description }]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Container */}
      <div
        role="region"
        aria-label="Notificações do Sistema"
        aria-live="polite"
        className="fixed bottom-20 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          const borderClass = isSuccess
            ? 'border-emerald-500/50 bg-emerald-950/80 text-emerald-200'
            : isError
            ? 'border-red-500/50 bg-red-950/80 text-red-200'
            : isWarning
            ? 'border-amber-500/50 bg-amber-950/80 text-amber-200'
            : 'border-cyan-500/50 bg-cyan-950/80 text-cyan-200';

          const Icon = isSuccess
            ? CheckCircle2
            : isError
            ? XCircle
            : isWarning
            ? AlertTriangle
            : Info;

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3.5 rounded-xl border backdrop-blur-md shadow-xl flex items-start gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${borderClass}`}
            >
              <Icon className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold leading-tight">{toast.title}</div>
                {toast.description && (
                  <div className="text-[11px] opacity-80 mt-0.5 leading-snug break-words">
                    {toast.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                aria-label="Fechar notificação"
                className="opacity-70 hover:opacity-100 p-0.5 rounded transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return safe fallback if used outside provider
    return {
      showToast: (title: string) => console.log(`[Toast Fallback] ${title}`),
      removeToast: () => {},
    };
  }
  return context;
}

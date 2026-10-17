import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Radio,
  Globe,
  HardDrive,
  WifiOff,
} from 'lucide-react';

export interface ProviderStatus {
  id: string;
  name: string;
  kind: 'gemini' | 'openai-compatible' | 'heuristic';
  description: string;
  isLocal: boolean;
  defaultModel: string;
  models: string[];
  costNotes: string;
  docsUrl?: string;
  /** true se o servidor tem a chave/URL configurada (o valor nunca sai do servidor). */
  enabled: boolean;
}

interface ProvidersViewProps {
  activeProviderId: string;
  activeModel: string;
  onSelectProvider: (providerId: string, model: string) => void;
}

/**
 * Central de Provedores de IA — dados REAIS vindos de /api/providers,
 * latência medida de verdade via /api/providers/test.
 * Custos e limites exibidos sem maquiagem (nada de "100% grátis" falso).
 */
export const ProvidersView: React.FC<ProvidersViewProps> = ({
  activeProviderId,
  activeModel,
  onSelectProvider,
}) => {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [pingResults, setPingResults] = useState<
    Record<string, { ok: boolean; latencyMs: number | null; message?: string }>
  >({});

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/providers');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProviders(data.providers ?? []);
      setOffline(false);
    } catch {
      setOffline(true);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  const testProvider = async (provider: ProviderStatus) => {
    setPingingId(provider.id);
    try {
      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: provider.id, model: provider.defaultModel }),
      });
      const data = await res.json();
      setPingResults((prev) => ({
        ...prev,
        [provider.id]: { ok: Boolean(data.ok), latencyMs: data.latencyMs, message: data.message },
      }));
    } catch (err) {
      setPingResults((prev) => ({
        ...prev,
        [provider.id]: { ok: false, latencyMs: null, message: err instanceof Error ? err.message : 'API inacessível' },
      }));
    } finally {
      setPingingId(null);
    }
  };

  const kindIcon = (p: ProviderStatus) =>
    p.kind === 'gemini' ? <Zap className="w-4 h-4" /> :
    p.kind === 'openai-compatible' ? (p.isLocal ? <HardDrive className="w-4 h-4" /> : <Server className="w-4 h-4" />) :
    <WifiOff className="w-4 h-4" />;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Central de Provedores de IA</h1>
          <p className="text-xs text-slate-400 mt-1">
            As chaves ficam somente no servidor (variáveis de ambiente). O app nunca envia ou armazena chaves.
          </p>
        </div>
        <button
          onClick={() => void loadProviders()}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors"
          aria-label="Recarregar provedores"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {offline && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          Backend inacessível. No preview estático (GitHub Pages) esta tela requer o servidor rodando
          (<code>npm start</code>). No modo offline o app usa o Heuristic Engine.
        </div>
      )}

      {loading && <p className="text-xs text-slate-400">Carregando provedores reais do servidor…</p>}

      <div className="space-y-3">
        {providers.map((p) => {
          const isActive = p.id === activeProviderId;
          const ping = pingResults[p.id];
          return (
            <div
              key={p.id}
              className={`rounded-2xl border p-4 transition-all ${
                isActive
                  ? 'border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                  : 'border-slate-700/60 bg-slate-900/60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-2 rounded-xl ${isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-300'}`}>
                    {kindIcon(p)}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      {p.name}
                      {p.enabled ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold">
                          Habilitado
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-700/60 text-slate-400 text-[10px] font-semibold">
                          Sem chave no servidor
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">{p.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => void testProvider(p)}
                  disabled={pingingId === p.id}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-800 text-[11px] font-semibold text-slate-200 hover:text-cyan-300 disabled:opacity-50 flex items-center gap-1"
                >
                  <Radio className={`w-3.5 h-3.5 ${pingingId === p.id ? 'animate-pulse' : ''}`} />
                  Testar
                </button>
              </div>

              {ping && (
                <p className={`text-[11px] mt-2 flex items-center gap-1 ${ping.ok ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {ping.ok ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Conectado — latência real {ping.latencyMs}ms
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" /> {ping.message ?? 'Falhou'}
                    </>
                  )}
                </p>
              )}

              {p.models.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.models.map((m) => (
                    <button
                      key={m}
                      onClick={() => onSelectProvider(p.id, m)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                        isActive && m === activeModel
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                          : 'bg-slate-800/70 text-slate-300 border border-transparent hover:border-slate-600'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[11px] text-slate-500 leading-snug">
                  <Globe className="w-3 h-3 inline mr-1" />
                  {p.costNotes}
                </p>
                {p.docsUrl && (
                  <a
                    href={p.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 shrink-0"
                  >
                    Docs ↗
                  </a>
                )}
              </div>

              <button
                onClick={() => onSelectProvider(p.id, p.defaultModel)}
                disabled={!p.enabled && p.kind !== 'heuristic'}
                className={`mt-3 w-full py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40'
                }`}
              >
                {isActive ? 'Ativo agora ✓' : p.enabled ? 'Usar este provedor' : 'Indisponível (configure no servidor)'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 text-[11px] text-slate-400 leading-relaxed">
        <p className="font-bold text-slate-200 text-xs mb-1 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5" /> Como habilitar um provedor (chave nunca vai pro frontend)
        </p>
        <p>No servidor, exporte a variável correspondente antes de <code>npm start</code>:</p>
        <ul className="mt-1 space-y-0.5 list-disc list-inside">
          <li><code>GEMINI_API_KEY</code> — Google AI Studio</li>
          <li><code>OPENROUTER_API_KEY</code> — openrouter.ai</li>
          <li><code>GROQ_API_KEY</code> — console.groq.com</li>
          <li><code>NVIDIA_NIM_API_KEY</code> — build.nvidia.com</li>
          <li><code>OLLAMA_BASE_URL</code> — ex.: http://192.168.0.10:11434 (rede local)</li>
        </ul>
      </div>
    </div>
  );
};

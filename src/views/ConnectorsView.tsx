import React, { useState, useEffect } from 'react';
import {
  Link2,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Trash2,
  KeyRound,
  Bot,
  GitBranch,
  Mail,
  Send,
  Cloud,
  Cpu,
  Server,
} from 'lucide-react';
import {
  CONNECTOR_CATALOG,
  CONNECTOR_CATEGORIES,
  type ConnectorCategory,
  type ConnectorSpec,
} from '../core/connectors/connectors-registry.ts';
import { getApiBase } from '../lib/api.ts';

/**
 * Hub de Conectores — fluxo igual ao Base44: o JARVIS leva o usuário ao
 * site oficial para autorizar; a credencial gerada volta e é validada de
 * verdade chamando a API pública do serviço. Nada de credencial falsa.
 *
 * Segurança: o token fica só no aparelho (localStorage). O servidor valida
 * de forma efêmera e não grava nada.
 */

interface ConnectionState {
  token: string;
  extra?: string;
  identity?: string;
  detail?: string;
  verifiedAt?: number;
}

const STORAGE_KEY = 'jarvis_nexus_connectors';

type StatusMap = Record<string, ConnectionState>;

function loadConnections(): StatusMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveConnections(map: StatusMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

const CATEGORY_ICONS: Record<ConnectorCategory, React.ReactNode> = {
  nuvem: <Cloud size={16} className="text-sky-400" />,
  ia: <Cpu size={16} className="text-emerald-400" />,
  dev: <GitBranch size={16} className="text-violet-400" />,
  mensageria: <Bot size={16} className="text-amber-400" />,
};

function connectorIcon(id: string) {
  if (id === 'github') return <GitBranch size={20} className="text-violet-400" />;
  if (id === 'gmail') return <Mail size={20} className="text-amber-400" />;
  if (id === 'telegram') return <Send size={20} className="text-sky-400" />;
  if (id === 'base44') return <Cloud size={20} className="text-cyan-400" />;
  if (id === 'ollama') return <Server size={20} className="text-emerald-400" />;
  return <Cpu size={20} className="text-emerald-400" />;
}

function ConnectorCard({
  spec,
  state,
  onVerified,
  onDisconnect,
}: {
  spec: ConnectorSpec;
  state?: ConnectionState;
  onVerified: (id: string, s: ConnectionState) => void;
  onDisconnect: (id: string) => void;
}) {
  const [token, setToken] = useState('');
  const [extra, setExtra] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connected = Boolean(state?.identity);

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/api/connectors/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectorId: spec.id, token, extra }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Credencial rejeitada pelo serviço.');
        return;
      }
      onVerified(spec.id, {
        token,
        extra: extra || undefined,
        identity: data.identity,
        detail: data.detail,
        verifiedAt: Date.now(),
      });
      setToken('');
      setExtra('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao validar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        connected ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700/60 bg-slate-900/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 shrink-0">{connectorIcon(spec.id)}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-100">{spec.name}</h3>
              {connected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                  <ShieldCheck size={11} /> {state?.identity}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/15 px-2 py-0.5 text-[11px] text-slate-400">
                  <KeyRound size={11} /> não conectado
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{spec.description}</p>
            {connected && state?.detail && (
              <p className="mt-1 text-[11px] text-emerald-400/80">{state.detail}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {connected && (
            <button
              onClick={() => onDisconnect(spec.id)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-red-400"
              title="Desconectar"
            >
              <Trash2 size={15} />
            </button>
          )}
          <button
            onClick={() => window.open(spec.officialUrl, '_blank', 'noopener,noreferrer')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/20"
          >
            <ExternalLink size={13} /> Autorizar no site oficial
          </button>
        </div>
      </div>

      {!connected && (
        <div className="mt-3">
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-[11px] text-slate-400 hover:text-slate-200 underline underline-offset-2"
          >
            {open ? 'Fechar' : 'Já tenho a credencial — conectar'}
          </button>
          {open && (
            <div className="mt-3 space-y-2 rounded-lg bg-slate-950/60 p-3 border border-slate-800">
              <ol className="list-decimal list-inside text-[11px] leading-relaxed text-slate-400 space-y-1">
                {spec.howTo.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={spec.tokenLabel}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
              />
              {spec.extraField && (
                <input
                  type="text"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder={spec.extraField.placeholder}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                />
              )}
              {error && (
                <p className="flex items-center gap-1 text-[11px] text-red-400">
                  <ShieldAlert size={12} /> {error}
                </p>
              )}
              <button
                onClick={verify}
                disabled={busy || !token.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600/80 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                {busy ? 'Validando no serviço oficial…' : 'Validar e conectar'}
              </button>
              <p className="text-[10px] leading-relaxed text-slate-500">
                A validação chama a API pública do serviço de verdade. A credencial fica só
                neste aparelho e nunca é gravada no servidor.
              </p>
            </div>
          )}
        </div>
      )}

      <a
        href={spec.docsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300"
      >
        <Link2 size={10} /> documentação oficial
      </a>
    </div>
  );
}

export const ConnectorsView: React.FC = () => {
  const [connections, setConnections] = useState<StatusMap>({});

  useEffect(() => {
    setConnections(loadConnections());
  }, []);

  const update = (map: StatusMap) => {
    setConnections(map);
    saveConnections(map);
  };

  const onVerified = (id: string, s: ConnectionState) =>
    update({ ...connections, [id]: s });

  const onDisconnect = (id: string) => {
    const next = { ...connections };
    delete next[id];
    update(next);
  };

  const connectedCount = Object.values(connections).filter((c) => c.identity).length;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-100">
          <Link2 className="text-sky-400" /> Conectores
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Fluxo igual ao Base44: o JARVIS abre o site oficial do serviço, você autoriza lá,
          e a credencial volta validada por chamada real à API. {connectedCount}{' '}
          {connectedCount === 1 ? 'conector ativo' : 'conectores ativos'} neste aparelho.
        </p>
      </header>

      {CONNECTOR_CATEGORIES.map((cat) => {
        const items = CONNECTOR_CATALOG.filter((c) => c.category === cat.id);
        if (!items.length) return null;
        return (
          <section key={cat.id} className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
              {CATEGORY_ICONS[cat.id]} {cat.label}
            </h2>
            <div className="grid gap-3">
              {items.map((spec) => (
                <ConnectorCard
                  key={spec.id}
                  spec={spec}
                  state={connections[spec.id]}
                  onVerified={onVerified}
                  onDisconnect={onDisconnect}
                />
              ))}
            </div>
          </section>
        );
      })}

      <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-[11px] leading-relaxed text-slate-500">
        <ShieldCheck size={13} className="mr-1 inline text-emerald-400" />
        Credenciais ficam apenas neste aparelho (localStorage) e o servidor nunca as armazena.
        Cada "Validar e conectar" executa uma chamada autêntica à API pública do serviço —
        se o serviço rejeitar, o JARVIS mostra o erro real sem inventar status.
      </p>
    </div>
  );
};

export default ConnectorsView;

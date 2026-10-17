import React, { useState, useCallback } from 'react';
import {
  Globe,
  Share2,
  Loader2,
  MonitorPlay,
  BookOpen,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { getApiBase } from '../lib/api.ts';

/**
 * Navegador ao vivo compartilhado (igual ao do Base44):
 * - Com BROWSERBASE_API_KEY/SECRET no servidor: abre uma sessão de navegador
 *   real na nuvem e devolve o link ao vivo (live view) pra embutir e
 *   compartilhar — qualquer pessoa com o link assiste a mesma navegação.
 * - Sem chaves: modo leitor honesto (busca e renderiza o texto real da
 *   página via webFetch) + tentativa de iframe direto. Nada é fingido.
 */

interface SessionInfo {
  mode: 'live' | 'reader';
  liveUrl?: string;
  sessionId?: string;
  notice?: string;
}

interface ReaderResult {
  url: string;
  title: string;
  text: string;
  truncated: boolean;
}

export const BrowserView: React.FC = () => {
  const [url, setUrl] = useState('https://');
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [reader, setReader] = useState<ReaderResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const openLive = useCallback(async () => {
    if (!url.trim() || url.trim() === 'https://') return;
    setBusy(true);
    setError(null);
    setReader(null);
    try {
      const res = await fetch(`${getApiBase()}/api/browser/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setSession(data as SessionInfo);
      if (data.mode === 'reader') {
        // Fallback: renderiza o texto real da página no próprio JARVIS.
        const readRes = await fetch(`${getApiBase()}/api/tools/web-fetch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim() }),
        });
        if (readRes.ok) setReader((await readRes.json()) as ReaderResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao abrir sessão.');
    } finally {
      setBusy(false);
    }
  }, [url]);

  const shareLive = async () => {
    if (!session?.liveUrl) return;
    try {
      await navigator.clipboard.writeText(session.liveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(session.liveUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-100">
          <MonitorPlay className="text-cyan-400" /> Navegador ao Vivo
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Sessão de navegador real na nuvem, compartilhável por link (co-browsing), igual ao
          navegador do Base44. Sem chaves configuradas, cai no modo leitor com o conteúdo
          real da página — nunca uma simulação.
        </p>
      </header>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && openLive()}
            placeholder="https://exemplo.com"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <button
          onClick={openLive}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
          Abrir
        </button>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          <ShieldAlert size={14} /> {error}
        </p>
      )}

      {session?.mode === 'live' && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-emerald-400">
              Sessão real ativa (id: {session.sessionId?.slice(0, 8)}…)
            </span>
            <button
              onClick={shareLive}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-medium text-cyan-300 hover:bg-cyan-500/20"
            >
              {copied ? 'Link copiado ✓' : <><Share2 size={12} /> Compartilhar sessão</>}
            </button>
          </div>
          <iframe
            src={session.liveUrl}
            title="Navegador ao vivo"
            className="h-[62vh] w-full rounded-xl border border-slate-700 bg-slate-950"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      )}

      {session?.mode === 'reader' && (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-300">
            <BookOpen size={13} /> {session.notice}
          </p>
          {reader && (
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <h2 className="text-sm font-semibold text-slate-100">{reader.title}</h2>
              <p className="mb-3 text-[11px] text-slate-500">{reader.url}</p>
              <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
                {reader.text.slice(0, 20000)}
                {reader.truncated && (
                  <span className="mt-2 block text-[11px] text-amber-400">… texto truncado (página grande)</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-[11px] leading-relaxed text-slate-500">
        Para sessões ao vivo de verdade (interativas e compartilháveis), crie uma conta grátis no
        Browserbase (browserbase.com) e defina BROWSERBASE_API_KEY e BROWSERBASE_API_SECRET no
        servidor. O JARVIS cria a sessão, navega e devolve o link ao vivo automaticamente.
      </p>
    </div>
  );
};

export default BrowserView;

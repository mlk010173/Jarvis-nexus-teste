import React, { useState, useCallback } from 'react';
import {
  Globe,
  Share2,
  Loader2,
  MonitorPlay,
  BookOpen,
  ShieldAlert,
  ExternalLink,
  Camera,
  MousePointerClick,
  Keyboard,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { getApiBase } from '../lib/api.ts';

/**
 * Navegador ao vivo compartilhado (igual ao do Base44), em 3 modos:
 *
 * 1) Modo Vivo self-hosted (NOVO — 100% open-source, sem chaves):
 *    Playwright/Chromium no próprio servidor. O JARVIS navega de verdade,
 *    mostra o PRINT da tela e executa ações (clique, digitação, rolagem).
 * 2) Modo live Browserbase: sessão na nuvem compartilhável por link
 *    (requer BROWSERBASE_API_KEY/SECRET).
 * 3) Modo leitor honesto: sem nada configurado, renderiza o texto real
 *    da página via webFetch. Nada é fingido.
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

interface LiveResult {
  ok: boolean;
  url: string;
  title: string;
  screenshotBase64: string;
  error?: string;
  available?: boolean;
}

export const BrowserView: React.FC = () => {
  const [url, setUrl] = useState('https://');
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [reader, setReader] = useState<ReaderResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Modo vivo self-hosted (Playwright)
  const [live, setLive] = useState<LiveResult | null>(null);
  const [liveBusy, setLiveBusy] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [selector, setSelector] = useState('');
  const [typed, setTyped] = useState('');

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

  const liveOpen = useCallback(async () => {
    if (!url.trim() || url.trim() === 'https://') return;
    setLiveBusy(true);
    setLiveError(null);
    try {
      const res = await fetch(`${getApiBase()}/api/browser/live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = (await res.json()) as LiveResult;
      if (!data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setLive(data);
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : 'Falha ao abrir navegador vivo.');
    } finally {
      setLiveBusy(false);
    }
  }, [url]);

  const liveAct = useCallback(async (body: Record<string, unknown>) => {
    setLiveBusy(true);
    setLiveError(null);
    try {
      const res = await fetch(`${getApiBase()}/api/browser/live/act`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as LiveResult;
      if (!data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (body.action === 'close') {
        setLive(null);
      } else {
        setLive(data);
      }
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : 'Ação falhou.');
    } finally {
      setLiveBusy(false);
    }
  }, []);

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

  const btnLive =
    'inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40';

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-100">
          <MonitorPlay className="text-cyan-400" /> Navegador ao Vivo
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Navegador REAL em dois modos: self-hosted com Playwright (open-source, o JARVIS
          navega, mostra o print da tela e executa ações) ou sessão compartilhável na nuvem
          com Browserbase. Sem nada configurado, cai no modo leitor com o conteúdo real —
          nunca uma simulação.
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
          onClick={liveOpen}
          disabled={liveBusy}
          title="Abre a página num Chromium real no servidor e mostra o print da tela"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {liveBusy ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
          Vivo
        </button>
        <button
          onClick={openLive}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
          Nuvem
        </button>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          <ShieldAlert size={14} /> {error}
        </p>
      )}

      {/* ===== MODO VIVO SELF-HOSTED (Playwright no servidor) ===== */}
      {liveError && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          <ShieldAlert size={14} /> {liveError}
        </p>
      )}

      {live?.screenshotBase64 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-emerald-400">
              Chromium real no servidor — {live.title || 'página'} · {live.url}
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => liveAct({ action: 'scroll', dy: -600 })} className={btnLive} disabled={liveBusy}>
                <ChevronUp size={12} /> Subir
              </button>
              <button onClick={() => liveAct({ action: 'scroll', dy: 600 })} className={btnLive} disabled={liveBusy}>
                <ChevronDown size={12} /> Descer
              </button>
              <button onClick={() => liveAct({ action: 'screenshot' })} className={btnLive} disabled={liveBusy}>
                <Camera size={12} /> Novo print
              </button>
              <button onClick={() => liveAct({ action: 'close' })} className={btnLive} disabled={liveBusy}>
                <X size={12} /> Fechar
              </button>
            </div>
          </div>
          <img
            src={`data:image/png;base64,${live.screenshotBase64}`}
            alt="Print da tela do navegador controlado pelo JARVIS"
            className="w-full rounded-xl border border-emerald-500/30 bg-slate-950"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
            <div className="flex min-w-[220px] flex-1 items-center gap-2">
              <MousePointerClick size={13} className="text-slate-500" />
              <input
                value={selector}
                onChange={(e) => setSelector(e.target.value)}
                placeholder="seletor CSS (ex: a[href='/docs'])"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
              />
              <button
                onClick={() => selector.trim() && liveAct({ action: 'click', selector: selector.trim() })}
                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
                disabled={liveBusy || !selector.trim()}
              >
                Clicar
              </button>
            </div>
            <div className="flex min-w-[260px] flex-1 items-center gap-2">
              <Keyboard size={13} className="text-slate-500" />
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="texto para digitar no seletor acima"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
              />
              <button
                onClick={() => selector.trim() && typed && liveAct({ action: 'type', selector: selector.trim(), text: typed })}
                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
                disabled={liveBusy || !selector.trim() || !typed}
              >
                Digitar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODO LIVE BROWSERBASE ===== */}
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
        <strong className="text-slate-400">Modo Vivo (recomendado, grátis):</strong> o servidor roda
        Chromium via Playwright (npm i playwright && npx playwright install chromium). O JARVIS abre
        páginas, clica, digita e tira print do que está mexendo — tudo open-source.{' '}
        <strong className="text-slate-400">Modo Nuvem:</strong> sessão compartilhável com link via
        Browserbase (BROWSERBASE_API_KEY/SECRET no servidor).
      </p>
    </div>
  );
};

export default BrowserView;

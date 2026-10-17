/**
 * JARVIS NEXUS — Ferramentas Web reais (server-side)
 *
 * webFetch: baixa uma URL e extrai texto legível (sem anúncios/scripts).
 * webSearch: busca real via endpoint público da DuckDuckGo (sem chave, sem custo),
 *            com parsing do HTML de resultados. Se a rede falhar, o chamador
 *            decide o fallback — nada de fingir resultados.
 */

const MAX_HTML_BYTES = 2 * 1024 * 1024; // 2 MB
const FETCH_TIMEOUT_MS = 12_000;

/** SSRF guard: bloqueia endereços internos/privados. */
export function isPublicHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const host = url.hostname;
    if (
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host === '169.254.169.254'
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Extrai texto principal de um HTML, removendo scripts/estilos e tags. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface WebFetchResult {
  url: string;
  title: string;
  text: string;
  truncated: boolean;
  status: number;
}

export async function webFetch(rawUrl: string): Promise<WebFetchResult> {
  if (!isPublicHttpUrl(rawUrl)) {
    throw new Error('URL inválida ou interna bloqueada pela política de segurança.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(rawUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'JarvisNexus/1.0 (+https://github.com/mlk010173/Jarvis-nexus-teste)' },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ao baixar ${rawUrl}`);
    }
    const html = (await res.text()).slice(0, MAX_HTML_BYTES);
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const text = htmlToText(html);
    const LIMIT = 20_000;
    return {
      url: rawUrl,
      title: titleMatch ? htmlToText(titleMatch[1]).slice(0, 200) : rawUrl,
      text: text.slice(0, LIMIT),
      truncated: text.length > LIMIT,
      status: res.status,
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface SearchHit {
  title: string;
  url: string;
  snippet: string;
}

/** Busca real via DuckDuckGo HTML (sem chave de API, sem custo). */
export async function webSearch(query: string, maxResults = 6): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36',
      },
    });
    if (!res.ok) throw new Error(`Busca indisponível (HTTP ${res.status}).`);

    const html = (await res.text()).slice(0, MAX_HTML_BYTES);
    const hits: SearchHit[] = [];

    // Resultados do DDG: <a class="result__a" href="...">título</a> + <a class="result__snippet">
    const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    const links = [...html.matchAll(linkRegex)];
    const snippets = [...html.matchAll(snippetRegex)];

    for (let i = 0; i < links.length && hits.length < maxResults; i++) {
      let href = links[i][1];
      // DDG às vezes embute redirect: https://duckduckgo.com/l/?uddg=<urlencoded>
      const uddg = href.match(/uddg=([^&]+)/);
      if (uddg) href = decodeURIComponent(uddg[1]);
      hits.push({
        title: htmlToText(links[i][2]).slice(0, 200),
        url: href.startsWith('http') ? href : `https:${href}`,
        snippet: snippets[i] ? htmlToText(snippets[i][1]).slice(0, 400) : '',
      });
    }

    if (hits.length === 0) throw new Error('Nenhum resultado parseado do buscador.');
    return hits;
  } finally {
    clearTimeout(timer);
  }
}

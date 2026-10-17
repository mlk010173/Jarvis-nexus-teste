/**
 * Navegador AO VIVO self-hosted (100% open-source, sem chaves pagas).
 *
 * Usa Playwright (Chromium headless) no próprio servidor:
 *   - abre páginas reais, clica, digita, rola e tira PRINT da tela
 *   - o frontend exibe o screenshot e envia ações — igual ao browser do Base44
 *   - degrada honestamente: sem Playwright instalado, responde available:false
 *     com instrução de instalação (npx playwright install chromium)
 *
 * Segurança: somente http/https, timeout de navegação de 30s, uma página
 * por vez (singleton), bloqueio de URLs internas (169.254/localhost) exceto
 * em modo dev (LIVE_BROWSER_ALLOW_LOCAL=1).
 */

type Page = {
  goto(url: string, opts?: Record<string, unknown>): Promise<unknown>;
  title(): Promise<string>;
  url(): string;
  screenshot(opts?: Record<string, unknown>): Promise<Buffer>;
  click(selector: string, opts?: Record<string, unknown>): Promise<void>;
  fill(selector: string, text: string, opts?: Record<string, unknown>): Promise<void>;
  keyboard: { press(key: string): Promise<void> };
  mouse: { wheel(dx: number, dy: number): Promise<void> };
  close(): Promise<void>;
  waitForTimeout?(ms: number): Promise<void>;
};

let pagePromise: Promise<Page | null> | null = null;
const PRIVATE_HOSTS = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i;

export function isAllowedUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return false;
    if (process.env.LIVE_BROWSER_ALLOW_LOCAL === '1') return true;
    return !PRIVATE_HOSTS.test(u.hostname);
  } catch {
    return false;
  }
}

async function loadPlaywright(): Promise<null | { chromium: { launch(opts?: Record<string, unknown>): Promise<unknown> } }> {
  try {
    const mod = (await import('playwright')) as unknown as ReturnType<typeof loadPlaywright>;
    return mod ?? null;
  } catch {
    return null;
  }
}

async function getPage(): Promise<Page | null> {
  if (!pagePromise) {
    pagePromise = (async () => {
      const pw = await loadPlaywright();
      if (!pw) return null;
      try {
        const browser = (await pw.chromium.launch({ headless: true, args: ['--no-sandbox'] })) as {
          newPage(): Promise<Page>;
          close(): Promise<void>;
        };
        const page = await browser.newPage();
        (page as unknown as { _browser?: unknown })._browser = browser;
        return page;
      } catch {
        return null;
      }
    })();
  }
  return pagePromise;
}

export async function isLiveBrowserAvailable(): Promise<boolean> {
  const page = await getPage();
  return page !== null;
}

export interface LiveNavResult {
  ok: true;
  url: string;
  title: string;
  screenshotBase64: string;
}

export async function liveNavigate(url: string): Promise<LiveNavResult | { ok: false; error: string; available: boolean }> {
  if (!isAllowedUrl(url)) {
    return { ok: false, available: true, error: 'URL inválida ou bloqueada (use http/https; hosts internos exigem LIVE_BROWSER_ALLOW_LOCAL=1).' };
  }
  const page = await getPage();
  if (!page) {
    return { ok: false, available: false, error: 'Playwright não instalado no servidor. Rode: npm i playwright && npx playwright install chromium' };
  }
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const shot = await page.screenshot({ type: 'png', fullPage: false });
    return {
      ok: true,
      url: page.url(),
      title: await page.title(),
      screenshotBase64: shot.toString('base64'),
    };
  } catch (err) {
    return { ok: false, available: true, error: `Falha ao navegar: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export type LiveAction =
  | { action: 'click'; selector: string }
  | { action: 'type'; selector: string; text: string }
  | { action: 'press'; key: string }
  | { action: 'scroll'; dy: number }
  | { action: 'screenshot' }
  | { action: 'close' };

export async function liveAct(a: LiveAction): Promise<LiveNavResult | { ok: false; error: string; available: boolean }> {
  const page = await getPage();
  if (!page) {
    return { ok: false, available: false, error: 'Playwright não instalado no servidor.' };
  }
  try {
    switch (a.action) {
      case 'click':
        await page.click(a.selector, { timeout: 10000 });
        break;
      case 'type':
        await page.fill(a.selector, a.text, { timeout: 10000 });
        break;
      case 'press':
        await page.keyboard.press(a.key);
        break;
      case 'scroll':
        await page.mouse.wheel(0, a.dy);
        break;
      case 'screenshot':
        break;
      case 'close': {
        await page.close();
        pagePromise = null;
        return { ok: true, url: '', title: '', screenshotBase64: '' };
      }
    }
    if (page.waitForTimeout) await page.waitForTimeout(600).catch(() => undefined);
    const shot = await page.screenshot({ type: 'png', fullPage: false });
    return {
      ok: true,
      url: page.url(),
      title: await page.title(),
      screenshotBase64: shot.toString('base64'),
    };
  } catch (err) {
    return { ok: false, available: true, error: `Ação falhou: ${err instanceof Error ? err.message : String(err)}` };
  }
}

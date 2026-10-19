/**
 * JARVIS NEXUS — Comandos de dados reais (server-side, sem chave, sem custo)
 *
 * clima:    Open-Meteo (geocoding + previsão atual) — API pública gratuita
 * moedas:   AwesomeAPI Economia (USD/EUR/GBP/BTC → BRL) — API pública gratuita
 * cripto:   Coinbase spot (BTC/ETH/SOL/... → BRL) — API pública gratuita
 * feriados: BrasilAPI (feriados nacionais do ano) — API pública gratuita
 * wiki:     Wikipédia PT (busca + resumo introdutório) — API pública gratuita
 *
 * Todos os dados vêm ao vivo das fontes; em falha de rede o chamador decide
 * o fallback — nada de fingir resultados.
 */

const FETCH_TIMEOUT_MS = 8_000;

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'JarvisNexus/1.0 (+https://github.com/mlk010173/Jarvis-nexus-teste)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ao consultar ${url}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ===== Clima (Open-Meteo) =====

const WEATHER_CODE_PT: Record<number, string> = {
  0: 'Céu limpo', 1: 'Predominantemente limpo', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Neblina', 48: 'Neblina com geada',
  51: 'Garoa leve', 53: 'Garoa', 55: 'Garoa forte', 56: 'Garoa congelante', 57: 'Garoa congelante forte',
  61: 'Chuva leve', 63: 'Chuva moderada', 65: 'Chuva forte', 66: 'Chuva congelante', 67: 'Chuva congelante forte',
  71: 'Neve leve', 73: 'Neve', 75: 'Neve forte', 77: 'Grãos de neve',
  80: 'Pancadas de chuva leves', 81: 'Pancadas de chuva', 82: 'Pancadas de chuva violentas',
  85: 'Neve leve', 86: 'Neve forte',
  95: 'Tempestade', 96: 'Tempestade com granizo leve', 99: 'Tempestade com granizo forte',
};

export interface ClimaResult {
  cidade: string;
  temperatura: number;
  sensacao: number;
  descricao: string;
  umidade: number;
  vento_kmh: number;
  minima: number;
  maxima: number;
  fonte: string;
}

export async function clima(cidade: string): Promise<ClimaResult> {
  const limpa = String(cidade || '').trim();
  if (!limpa) throw new Error('Informe a cidade (ex: clima em Vila Velha).');

  const geo = (await getJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(limpa)}&count=1&language=pt&format=json`
  )) as { results?: Array<{ name: string; admin1?: string; country?: string; latitude: number; longitude: number }> };
  const local = geo?.results?.[0];
  if (!local) throw new Error(`Cidade não encontrada: ${limpa}`);

  const w = (await getJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${local.latitude}&longitude=${local.longitude}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`
  )) as {
    current: { temperature_2m: number; relative_humidity_2m: number; apparent_temperature: number; weather_code: number; wind_speed_10m: number };
    daily: { temperature_2m_max: number[]; temperature_2m_min: number[] };
  };
  const cur = w.current;
  return {
    cidade: [local.name, local.admin1, local.country].filter(Boolean).join(', '),
    temperatura: cur.temperature_2m,
    sensacao: cur.apparent_temperature,
    descricao: WEATHER_CODE_PT[cur.weather_code] ?? '—',
    umidade: cur.relative_humidity_2m,
    vento_kmh: cur.wind_speed_10m,
    minima: w.daily.temperature_2m_min[0],
    maxima: w.daily.temperature_2m_max[0],
    fonte: 'Open-Meteo',
  };
}

// ===== Moedas (AwesomeAPI) =====

export interface Cotacao { moeda: string; valor_brl: number; variacao_pct: number; atualizado: string }

export async function moedas(): Promise<{ base: string; cotacoes: Cotacao[]; fonte: string }> {
  // 1) Fonte primária: AwesomeAPI Economia (com variação % do dia).
  try {
    const d = (await getJson('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,GBP-BRL,BTC-BRL')) as Record<
      string,
      { codein?: string; bid?: string; pctChange?: string; create_date?: string }
    >;
    const cotacoes: Cotacao[] = Object.entries(d)
      .filter(([, v]) => v && v.codein === 'BRL' && v.bid)
      .map(([k, v]) => ({
        moeda: k.replace('-BRL', ''),
        valor_brl: Number(v.bid),
        variacao_pct: Number(v.pctChange ?? 0),
        atualizado: String(v.create_date ?? ''),
      }));
    if (cotacoes.length) return { base: 'BRL', cotacoes, fonte: 'AwesomeAPI Economia' };
  } catch {
    // cai no fallback abaixo
  }

  // 2) Fallback: Frankfurter (Banco Central Europeu, sem chave) + Coinbase p/ BTC.
  const pares: Array<[string, string]> = [['USD', 'Dólar'], ['EUR', 'Euro'], ['GBP', 'Libra']];
  const cotacoes: Cotacao[] = [];
  for (const [sigla, nome] of pares) {
    const r = (await getJson(`https://api.frankfurter.dev/v1/latest?base=${sigla}&symbols=BRL`)) as {
      date?: string;
      rates?: { BRL?: number };
    };
    if (r?.rates?.BRL) {
      cotacoes.push({ moeda: sigla, valor_brl: r.rates.BRL, variacao_pct: 0, atualizado: String(r.date ?? '') });
    }
  }
  try {
    const btc = await cripto('BTC');
    cotacoes.push({ moeda: 'BTC', valor_brl: btc.valor_brl, variacao_pct: 0, atualizado: 'spot' });
  } catch {
    // BTC opcional no fallback
  }
  if (!cotacoes.length) throw new Error('Cotações indisponíveis agora.');
  return { base: 'BRL', cotacoes, fonte: 'Frankfurter (BCE) + Coinbase' };
}

// ===== Cripto (Coinbase spot) =====

export async function cripto(simbolo = 'BTC'): Promise<{ cripto: string; valor_brl: number; fonte: string }> {
  const s = String(simbolo || 'BTC').trim().toUpperCase() || 'BTC';
  const d = (await getJson(`https://api.coinbase.com/v2/prices/${s}-BRL/spot`)) as { data?: { amount?: string } };
  const valor = Number(d?.data?.amount);
  if (!valor) throw new Error(`Preço indisponível para ${s}-BRL.`);
  return { cripto: s, valor_brl: valor, fonte: 'Coinbase' };
}

// ===== Feriados (BrasilAPI) =====

export async function feriados(ano?: number): Promise<{ ano: number; feriados: Array<{ data: string; nome: string }>; fonte: string }> {
  const y = Number(ano) > 1990 ? Number(ano) : new Date().getFullYear();
  const d = (await getJson(`https://brasilapi.com.br/api/feriados/v1/${y}`)) as Array<{ date: string; name: string }>;
  if (!Array.isArray(d)) throw new Error(`Feriados de ${y} indisponíveis.`);
  return { ano: y, feriados: d.map((f) => ({ data: f.date, nome: f.name })), fonte: 'BrasilAPI' };
}

// ===== Wikipédia PT =====

export interface WikiResult {
  titulo: string;
  resumo: string;
  url: string;
  relacionados: string[];
  fonte: string;
}

export async function wiki(termo: string): Promise<WikiResult> {
  const t = String(termo || '').trim();
  if (!t) throw new Error('Informe o termo para consultar a Wikipédia.');

  const s = (await getJson(
    `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(t)}&srlimit=3&format=json&origin=*`
  )) as { query?: { search?: Array<{ title: string }> } };
  const hits = s?.query?.search ?? [];
  if (!hits.length) throw new Error(`Nada encontrado na Wikipédia para: ${t}`);

  const titulo = hits[0].title;
  const ex = (await getJson(
    `https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(titulo)}&format=json&origin=*`
  )) as { query?: { pages?: Record<string, { extract?: string }> } };
  const page = ex?.query?.pages ? Object.values(ex.query.pages)[0] : undefined;
  return {
    titulo,
    resumo: String(page?.extract ?? '').slice(0, 900),
    url: `https://pt.wikipedia.org/wiki/${encodeURIComponent(titulo.replace(/ /g, '_'))}`,
    relacionados: hits.slice(1, 3).map((h) => h.title),
    fonte: 'Wikipédia PT',
  };
}

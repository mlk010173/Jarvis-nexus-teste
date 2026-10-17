/**
 * Geração de imagem — equivalente FREE do generate_image do Base44.
 *
 * Usa Pollinations (open-source, sem chave, sem cadastro):
 *   GET https://image.pollinations.ai/prompt/{prompt}?width&height&nologo
 * Devolve o PNG em base64 e o URL público direto.
 */

export interface ImageGenResult {
  ok: boolean;
  url?: string;
  base64?: string;
  error?: string;
}

export async function generateImage(prompt: string, width = 1024, height = 1024): Promise<ImageGenResult> {
  const clean = (prompt ?? '').trim().slice(0, 800);
  if (!clean) return { ok: false, error: 'Prompt obrigatório.' };
  const w = Math.min(Math.max(Number(width) || 1024, 256), 1536);
  const h = Math.min(Math.max(Number(height) || 1024, 256), 1536);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(clean)}?width=${w}&height=${h}&nologo=true`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
    if (!res.ok) return { ok: false, error: `Pollinations respondeu ${res.status}.` };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return { ok: false, error: 'Imagem retornada vazia/inválida.' };
    return { ok: true, url, base64: buf.toString('base64') };
  } catch (err) {
    return { ok: false, error: `Falha ao gerar imagem: ${err instanceof Error ? err.message : String(err)}` };
  }
}

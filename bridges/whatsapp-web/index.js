/**
 * JARVIS NEXUS — Bridge WhatsApp local (whatsapp-web.js, open-source).
 *
 * Alternativa 100% gratuita à Cloud API da Meta: usa o SEU WhatsApp
 * pessoal (mesmo número, +55 27 99851-8705) via QR Code.
 *
 * COMO RODAR (no seu PC ou Termux, não no Render — precisa de sessão persistente):
 *   1) cd bridges/whatsapp-web && npm install
 *   2) JARVIS_URL=https://SEU-JARVIS.onrender.com npm start
 *   3) Abra o QR no terminal e escaneie com o WhatsApp do celular (só uma vez)
 *   4) Toda mensagem recebida acorda o JARVIS via /api/wake e a resposta volta no chat
 *
 * Requisitos: Node 18+. Baixe o Chromium do puppeteer automaticamente.
 * Aviso: uso não oficial pode violar os Termos da Meta em contas pessoais.
 */
import qrcode from 'qrcode-terminal';
import WhatsAppWeb from 'whatsapp-web.js';

const JARVIS_URL = process.env.JARVIS_URL ?? 'http://localhost:3000';
const OWNER = process.env.OWNER_WHATSAPP ?? '5527998518705'; // dono: +55 27 99851-8705
const ALLOWED_FROM = (process.env.WHATSAPP_ALLOWED_FROM ?? OWNER).split(',').map((x) => x.trim()).filter(Boolean);

const client = new WhatsAppWeb.Client({
  authStrategy: new WhatsAppWeb.LocalAuth({ dataPath: './session' }),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
});

client.on('qr', (qr: string) => {
  console.log('\n=== ESCANEIE ESTE QR NO SEU WHATSAPP (aparelhos > Conectar aparelho) ===\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('JARVIS conectado ao WhatsApp como', client.info?.wid?.user ?? 'conta');
});

client.on('message', async (msg: { from: string; body: string; reply: (t: string) => Promise<unknown> }) => {
  if (msg.from.endsWith('@g.us') || !msg.body?.trim()) return; // só DMs com texto
  if (ALLOWED_FROM.length && !ALLOWED_FROM.includes(msg.from.replace(/\D/g, ''))) return;
  try {
    const r = await fetch(`${JARVIS_URL}/api/wake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Mensagem recebida no WhatsApp de ${msg.from}: "${msg.body}". Responda ao remetente de forma útil e curta.`,
        source: `whatsapp:${msg.from}`,
      }),
    });
    const data = (await r.json()) as { response?: string };
    if (data.response) await msg.reply(data.response);
  } catch (err) {
    console.error('wake falhou:', err);
  }
});

client.initialize();

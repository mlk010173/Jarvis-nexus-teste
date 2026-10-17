/**
 * JARVIS NEXUS — Registro de Conectores (padrão "levo você ao site oficial")
 *
 * Cada conector aponta para a página OFICIAL de autorização/criação de
 * credencial. O JARVIS nunca pede senha: o usuário autoriza no site do
 * provedor (igual ao fluxo de conectores do Base44) e o token gerado é
 * verificado de verdade chamando a API pública do serviço.
 *
 * Regras de segurança:
 * - O token fica APENAS no aparelho do usuário (localStorage), nunca no servidor.
 * - O endpoint /api/connectors/verify valida o token de forma efêmera
 *   (chamada única, nada é gravado) e devolve só o dado público (login/email/nome do bot).
 */

export type ConnectorCategory = 'ia' | 'dev' | 'mensageria' | 'nuvem';

export type VerifyKind =
  | 'bearer-user' // Authorization: Bearer <token> em GET baseUrl → retorna identidade
  | 'telegram-getme' // GET https://api.telegram.org/bot<token>/getMe
  | 'models-list' // Bearer em GET baseUrl/models (chaves de provedores de IA)
  | 'gmail-profile' // Bearer em GET gmail/v1/users/me/profile
  | 'gmail-imap' // Login IMAP real (e-mail + senha de app) via imapflow no servidor
  | 'base44-agent' // api_key em GET /api/agents/<id>/conversations
  | 'ollama-tags'; // GET baseUrl/api/tags sem auth (servidor local)

export interface ConnectorSpec {
  id: string;
  name: string;
  category: ConnectorCategory;
  description: string;
  /** Variáveis de ambiente do servidor que habilitam o conector. */
  envKeys?: string[];
  /** Página oficial onde o usuário cria/autoriza a credencial. */
  officialUrl: string;
  docsUrl: string;
  /** Passos curtos e honestos para obter a credencial. */
  howTo: string[];
  /** Rótulo do campo de credencial na UI. */
  tokenLabel: string;
  /** URL para validar a credencial (a verificação é sempre real). */
  verify: { kind: VerifyKind; baseUrl: string };
  /** Extras necessários (ex.: id do agente Base44). */
  extraField?: { key: string; label: string; placeholder: string };
}

export const CONNECTOR_CATALOG: ConnectorSpec[] = [
  {
    id: 'base44',
    name: 'Base44 Superagent',
    category: 'nuvem',
    description:
      'Conecta o JARVIS ao seu Superagent do Base44 (memória persistente, ferramentas e conectores do agente). O JARVIS vira interface remota dele.',
    officialUrl: 'https://app.base44.com',
    docsUrl: 'https://docs.base44.com/Getting-Started/ai-agent',
    howTo: [
      'Abra seu agente no Base44 (app.base44.com).',
      'Em Settings, gere a API key do agente.',
      'Copie o id do agente (da URL) e a API key.',
      'Configure BASE44_API_KEY e BASE44_AGENT_ID no servidor, ou valide aqui para uso direto na interface.',
    ],
    tokenLabel: 'API key do agente (Base44)',
    verify: { kind: 'base44-agent', baseUrl: 'https://api.base44.com' },
    extraField: { key: 'agentId', label: 'Id do agente', placeholder: 'ex.: 6ac03c4c0177787eb59621ed' },
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'dev',
    description:
      'Acesso à API do GitHub (repositórios, issues, PRs) com token fine-grained criado na página oficial.',
    officialUrl: 'https://github.com/settings/tokens?type=beta',
    docsUrl: 'https://docs.github.com/rest',
    howTo: [
      'Abra github.com/settings/tokens (fine-grained).',
      'Gere um token só com as permissões que precisa (ex.: repositórios públicos: somente leitura).',
      'Cole o token aqui — a validação chama api.github.com/user de verdade.',
    ],
    tokenLabel: 'Token de acesso (ghp_… ou github_pat_…)',
    verify: { kind: 'bearer-user', baseUrl: 'https://api.github.com' },
  },
  {
    id: 'gmail',
    name: 'Gmail (Google OAuth)',
    category: 'mensageria',
    description:
      'Acesso ao Gmail via OAuth do Google. O consentimento é dado na conta Google do usuário.',
    officialUrl: 'https://console.cloud.google.com/apis/credentials',
    docsUrl: 'https://developers.google.com/gmail/api/guides',
    howTo: [
      'No Google Cloud Console, crie um projeto e um OAuth Client (escopo gmail.readonly).',
      'Autorize sua conta em accounts.google.com (consentimento oficial do Google).',
      'Gere o token de acesso OAuth e cole aqui — validamos com gmail/v1/users/me/profile.',
    ],
    tokenLabel: 'Access token OAuth (ya29.…)',
    verify: { kind: 'gmail-profile', baseUrl: 'https://gmail.googleapis.com/gmail/v1' },
  },
  {
    id: 'gmail-imap',
    name: 'Gmail (senha de app)',
    category: 'mensageria',
    description:
      'Leitura e envio de e-mail do Gmail direto pelo servidor (IMAP + SMTP), sem projeto no Google Cloud. Usa uma senha de app criada na sua conta Google.',
    officialUrl: 'https://myaccount.google.com/apppasswords',
    docsUrl: 'https://support.google.com/accounts/answer/185833',
    howTo: [
      'Na conta Google, ative a verificação em duas etapas (Segurança > Verificação em duas etapas).',
      'Crie uma senha de app em myaccount.google.com/apppasswords (ex.: "Jarvis Nexus").',
      'No servidor, defina GMAIL_USER (seu e-mail) e GMAIL_APP_PASSWORD (a senha de app de 16 letras) — ou valide aqui colando a senha.',
    ],
    tokenLabel: 'Senha de app (16 letras, ex.: abcd efgh ijkl mnop)',
    envKeys: ['GMAIL_USER', 'GMAIL_APP_PASSWORD'],
    verify: { kind: 'gmail-imap', baseUrl: 'imap.gmail.com' },
  },
  {
    id: 'telegram',
    name: 'Telegram Bot',
    category: 'mensageria',
    description:
      'Bot do Telegram criado pelo BotFather oficial; o JARVIS valida com getMe e mostra o nome real do bot.',
    officialUrl: 'https://t.me/botfather',
    docsUrl: 'https://core.telegram.org/bots/api',
    howTo: [
      'Fale com @BotFather no Telegram e use /newbot.',
      'Copie o token gerado (formato 123456:ABC-…).',
      'Cole aqui — chamamos getMe de verdade para confirmar.',
    ],
    tokenLabel: 'Token do bot (123456:ABC-…)',
    verify: { kind: 'telegram-getme', baseUrl: 'https://api.telegram.org' },
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    category: 'ia',
    description: 'Dezenas de modelos (incluindo :free) com uma única chave oficial.',
    officialUrl: 'https://openrouter.ai/settings/keys',
    docsUrl: 'https://openrouter.ai/docs',
    howTo: ['Crie a key em openrouter.ai/settings/keys.', 'Cole aqui — validamos com a lista de modelos da conta.'],
    tokenLabel: 'API key (sk-or-v1-…)',
    verify: { kind: 'models-list', baseUrl: 'https://openrouter.ai/api/v1' },
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    category: 'ia',
    description: 'Inferência ultrarrápida (LPU) com camada gratuita.',
    officialUrl: 'https://console.groq.com/keys',
    docsUrl: 'https://console.groq.com/docs',
    howTo: ['Gere a key em console.groq.com/keys.', 'Cole aqui — validamos com /models da Groq.'],
    tokenLabel: 'API key (gsk_…)',
    verify: { kind: 'models-list', baseUrl: 'https://api.groq.com/openai/v1' },
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    category: 'ia',
    description: 'Modelos Grok direto da xAI com API compatível OpenAI.',
    officialUrl: 'https://console.x.ai',
    docsUrl: 'https://docs.x.ai',
    howTo: ['Crie a conta em console.x.ai e gere a API key.', 'Cole aqui — validamos com /models da xAI.'],
    tokenLabel: 'API key (xai-…)',
    verify: { kind: 'models-list', baseUrl: 'https://api.x.ai/v1' },
  },
  {
    id: 'moonshot',
    name: 'Moonshot AI (Kimi)',
    category: 'ia',
    description: 'Modelos Kimi K2 com raciocínio (reasoning_content) via API oficial.',
    officialUrl: 'https://platform.moonshot.ai/console/api-keys',
    docsUrl: 'https://platform.moonshot.ai/docs',
    howTo: ['Gere a key em platform.moonshot.ai.', 'Cole aqui — validamos com /models da Moonshot.'],
    tokenLabel: 'API key (sk-…)',
    verify: { kind: 'models-list', baseUrl: 'https://api.moonshot.ai/v1' },
  },
  {
    id: 'opencode-zen',
    name: 'OpenCode Zen',
    category: 'ia',
    description: 'Modelos free (Nemotron, DeepSeek, MiMo) hospedados grátis pelo OpenCode.',
    officialUrl: 'https://opencode.ai/auth',
    docsUrl: 'https://opencode.ai/docs/zen',
    howTo: ['Entre em opencode.ai/auth e copie sua key.', 'Cole aqui — validamos com /models do Zen.'],
    tokenLabel: 'API key do Zen',
    verify: { kind: 'models-list', baseUrl: 'https://opencode.ai/inference/openai/v1' },
  },
  {
    id: 'ollama',
    name: 'Ollama (local, open-source)',
    category: 'ia',
    description:
      'Modelos 100% locais e open-source (Llama, Qwen, Hermes) rodando no seu aparelho/Termux — sem nuvem.',
    officialUrl: 'https://ollama.com/download',
    docsUrl: 'https://ollama.com/library',
    howTo: [
      'Instale o Ollama (ollama.com/download) e rode: ollama serve.',
      'Baixe um modelo: ollama pull llama3.2.',
      'Aponte o endereço aqui (padrão http://localhost:11434) — checamos /api/tags de verdade.',
    ],
    tokenLabel: 'Endereço do servidor (http://localhost:11434)',
    verify: { kind: 'ollama-tags', baseUrl: 'http://localhost:11434' },
  },
];

export function findConnector(id: string): ConnectorSpec | undefined {
  return CONNECTOR_CATALOG.find((c) => c.id === id);
}

/** Categorias para agrupar a UI. */
export const CONNECTOR_CATEGORIES: Array<{ id: ConnectorCategory; label: string }> = [
  { id: 'nuvem', label: 'Nuvem & Superagentes' },
  { id: 'ia', label: 'Modelos de IA' },
  { id: 'dev', label: 'Desenvolvimento' },
  { id: 'mensageria', label: 'Mensageria' },
];

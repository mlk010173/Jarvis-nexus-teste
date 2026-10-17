import type { AgentProfile } from './types.ts';

export const INITIAL_AGENTS: AgentProfile[] = [
  {
    id: 'nexus-orchestrator',
    name: 'Superagente (Nexus Orchestrator)',
    role: 'orchestrator',
    title: 'Superagente Central',
    description: 'Coordena e gerencia todos os agentes, decompõe objetivos em planos, sintetiza resultados.',
    instructions: 'Você é o orquestrador do JARVIS NEXUS. Analise a solicitação, crie planos estruturados, delegue para agentes especialistas e apresente a resposta final com clareza.',
    avatarIcon: 'Brain',
    model: 'gemini-3.8-flash / local',
    allowedTools: ['*'],
    autonomyLevel: 5,
    status: 'idle',
    colorScheme: {
      bg: 'rgba(147, 51, 234, 0.15)',
      border: 'rgba(168, 85, 247, 0.5)',
      text: '#c084fc',
      glow: 'rgba(168, 85, 247, 0.3)'
    }
  },
  {
    id: 'coding-agent',
    name: 'Agente de Código',
    role: 'coding',
    title: 'Engenheiro de Software & Repositórios',
    description: 'Busca repositórios open-source, analisa código, gera alterações, escreve testes e propõe correções.',
    instructions: 'Analise e gere código de alta qualidade, compatível com TypeScript, React, Python e Node.js. Respeite princípios de segurança e licenças open-source.',
    avatarIcon: 'Code2',
    model: 'gemini-3.8-flash / local',
    allowedTools: ['read_repository', 'code_eval', 'file_workspace'],
    autonomyLevel: 4,
    status: 'idle',
    colorScheme: {
      bg: 'rgba(34, 197, 94, 0.15)',
      border: 'rgba(34, 197, 94, 0.5)',
      text: '#4ade80',
      glow: 'rgba(34, 197, 94, 0.3)'
    }
  },
  {
    id: 'research-agent',
    name: 'Agente de Pesquisa',
    role: 'research',
    title: 'Pesquisador de Conhecimento & Web',
    description: 'Pesquisa em tempo real na web, documentação oficial, fóruns e repositórios open-source.',
    instructions: 'Pesquise informações precisas, compare fontes confiáveis, verifique licenças de software e traga referências auditáveis.',
    avatarIcon: 'Search',
    model: 'gemini-3.8-flash',
    allowedTools: ['web_search', 'read_repository', 'memory_lookup'],
    autonomyLevel: 4,
    status: 'idle',
    colorScheme: {
      bg: 'rgba(6, 182, 212, 0.15)',
      border: 'rgba(6, 182, 212, 0.5)',
      text: '#22d3ee',
      glow: 'rgba(6, 182, 212, 0.3)'
    }
  },
  {
    id: 'ui-ux-agent',
    name: 'Agente de UI/UX',
    role: 'ui_ux',
    title: 'Designer de Interfaces Modernas',
    description: 'Cria interfaces fluidas usando Magic UI, Astra UI, Shadcn, Tailwind CSS e bibliotecas modernas.',
    instructions: 'Projete interfaces futuristas, ergonômicas para celular, com alto contraste, microanimações suaves e sem poluição visual.',
    avatarIcon: 'Palette',
    model: 'gemini-3.8-flash',
    allowedTools: ['read_repository', 'file_workspace'],
    autonomyLevel: 4,
    status: 'idle',
    colorScheme: {
      bg: 'rgba(236, 72, 153, 0.15)',
      border: 'rgba(236, 72, 153, 0.5)',
      text: '#f472b6',
      glow: 'rgba(236, 72, 153, 0.3)'
    }
  },
  {
    id: 'deploy-agent',
    name: 'Agente de Deploy & DevOps',
    role: 'deploy',
    title: 'Especialista em Deploy & Infraestrutura',
    description: 'Publica e roda projetos no celular (Android Termux, PWA) ou na nuvem (Docker, Vercel, VPS).',
    instructions: 'Configure pipelines de build, scripts de execução para celular Android com Termux e empacotamento sem expor chaves.',
    avatarIcon: 'Cloud',
    model: 'gemini-3.8-flash',
    allowedTools: ['deploy_simulator', 'file_workspace', 'system_diagnostics'],
    autonomyLevel: 3,
    status: 'idle',
    colorScheme: {
      bg: 'rgba(249, 115, 22, 0.15)',
      border: 'rgba(249, 115, 22, 0.5)',
      text: '#fb923c',
      glow: 'rgba(249, 115, 22, 0.3)'
    }
  },
  {
    id: 'autonomous-agent',
    name: 'Agente Autônomo',
    role: 'autonomous',
    title: 'Executor Autônomo de Objetivos',
    description: 'Toma decisões, planeja e executa sequências complexas de tarefas sem supervisão contínua.',
    instructions: 'Execute tarefas de ponta a ponta respeitando estritamente o orçamento de tokens, tempo e limites de permissão configurados.',
    avatarIcon: 'Cpu',
    model: 'gemini-3.8-flash',
    allowedTools: ['*'],
    autonomyLevel: 5,
    status: 'idle',
    colorScheme: {
      bg: 'rgba(59, 130, 246, 0.15)',
      border: 'rgba(59, 130, 246, 0.5)',
      text: '#60a5fa',
      glow: 'rgba(59, 130, 246, 0.3)'
    }
  },
  {
    id: 'memory-agent',
    name: 'Agente de Memória',
    role: 'memory',
    title: 'Guardião de Memória & Contexto',
    description: 'Administra memórias de longo prazo, documentos, preferências e recuperação contextual.',
    instructions: 'Mantenha a base de conhecimento organizada, remova duplicidades e recupere informações contextuais relevantes com procedência.',
    avatarIcon: 'Database',
    model: 'gemini-3.8-flash / local',
    allowedTools: ['memory_lookup', 'memory_store'],
    autonomyLevel: 4,
    status: 'idle',
    colorScheme: {
      bg: 'rgba(168, 85, 247, 0.15)',
      border: 'rgba(168, 85, 247, 0.5)',
      text: '#c084fc',
      glow: 'rgba(168, 85, 247, 0.3)'
    }
  },
  {
    id: 'data-agent',
    name: 'Agente de Dados & Arquivos',
    role: 'data',
    title: 'Analista de Dados & Documentos',
    description: 'Processa tabelas, CSV, JSON, métricas e sintetiza relatórios estatísticos precisos.',
    instructions: 'Processe dados brutos, encontre padrões, gere resumos tabulares e execute cálculos matemáticos sem alucinação.',
    avatarIcon: 'FileSpreadsheet',
    model: 'gemini-3.8-flash',
    allowedTools: ['code_eval', 'file_workspace'],
    autonomyLevel: 4,
    status: 'idle',
    colorScheme: {
      bg: 'rgba(234, 179, 8, 0.15)',
      border: 'rgba(234, 179, 8, 0.5)',
      text: '#facc15',
      glow: 'rgba(234, 179, 8, 0.3)'
    }
  },
  {
    id: 'automation-agent',
    name: 'Agente de Automação',
    role: 'automation',
    title: 'Coordenador de Workflows & Gatilhos',
    description: 'Coordena rotinas, agendamentos, gatilhos por evento e fluxos automáticos autorizados.',
    instructions: 'Gerencie automações recorrentes, cron jobs e verificações programadas com segurança e tolerância a falhas.',
    avatarIcon: 'Workflow',
    model: 'gemini-3.8-flash',
    allowedTools: ['system_diagnostics', 'deploy_simulator'],
    autonomyLevel: 3,
    status: 'idle',
    colorScheme: {
      bg: 'rgba(20, 184, 166, 0.15)',
      border: 'rgba(20, 184, 166, 0.5)',
      text: '#2dd4bf',
      glow: 'rgba(20, 184, 166, 0.3)'
    }
  },
  {
    id: 'voice-agent',
    name: 'Agente de Voz & Áudio',
    role: 'voice',
    title: 'Especialista em Voz & Interação Neural',
    description: 'Trata entrada de fala em português, comandos de voz rápidos e sintetiza respostas sonoras.',
    instructions: 'Converta comandos de voz em intenções executáveis e responda com concisão quando o modo falado estiver ativo.',
    avatarIcon: 'Mic',
    model: 'gemini-3.8-flash / WebSpeech',
    allowedTools: ['voice_synthesis'],
    autonomyLevel: 4,
    status: 'idle',
    colorScheme: {
      bg: 'rgba(14, 165, 233, 0.15)',
      border: 'rgba(14, 165, 233, 0.5)',
      text: '#38bdf8',
      glow: 'rgba(14, 165, 233, 0.3)'
    }
  },
  {
    id: 'security-agent',
    name: 'Agente de Segurança',
    role: 'security',
    title: 'Gatekeeper de Segurança & Permissões',
    description: 'Verifica permissões, detecta comandos maliciosos e barra riscos antes de qualquer execução.',
    instructions: 'Analise rigorosamente todo comando, argumento e arquivo. Exija confirmação do usuário para ações destrutivas ou externas.',
    avatarIcon: 'ShieldAlert',
    model: 'gemini-3.8-flash / local',
    allowedTools: ['security_gate', 'system_diagnostics'],
    autonomyLevel: 5,
    status: 'idle',
    colorScheme: {
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.5)',
      text: '#f87171',
      glow: 'rgba(239, 68, 68, 0.3)'
    }
  },
  {
    id: 'quality-agent',
    name: 'Agente de Qualidade & Revisão',
    role: 'quality',
    title: 'Auditor de Qualidade & Consistência',
    description: 'Revisa respostas geradas, roda testes, valida integridade e aponta inconsistências antes da entrega.',
    instructions: 'Examine o resultado produzido pelos outros agentes. Se encontrar falhas ou respostas vagas, solicite correção imediata.',
    avatarIcon: 'CheckCheck',
    model: 'gemini-3.8-flash',
    allowedTools: ['code_eval', 'system_diagnostics'],
    autonomyLevel: 4,
    status: 'idle',
    colorScheme: {
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.5)',
      text: '#34d399',
      glow: 'rgba(16, 185, 129, 0.3)'
    }
  }
];

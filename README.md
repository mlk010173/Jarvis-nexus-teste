# JARVIS NEXUS — Superagente Autônomo Open-Source para Celular

> **Plataforma multiagente autônoma, modular e expansível inspirada em assistentes sci-fi, construída com tecnologias 100% reais e open-source para celular Android e web.**

---

## 🌟 Visão Geral

O **JARVIS NEXUS** não é apenas um chatbot convencional. É um ecossistema coordenado de inteligência artificial com o **Nexus Orchestrator** no comando, capaz de decompor objetivos em subtarefas, delegar para agentes especializados, invocar ferramentas auditadas e acompanhar projetos até a conclusão.

Projetado primordialmente para **celulares Android** (Mobile-First, PWA e Termux), o sistema preserva funcionamento offline ou degradado caso provedores remotos estejam inacessíveis.

---

## 🏗️ Arquitetura Multiagente

### Nexus Orchestrator (Superagente Central)
- Interpretação de linguagem natural em português brasileiro.
- Planejamento de tarefas simples e decomposição de metas complexas em subtarefas.
- Execução ordenada com resolução de dependências (`dependsOn`) e suporte a paralelismo.
- Monitoramento de progresso (%) em tempo real e orçamentos de tokens.
- Cancelamento manual de emergência.

### 12 Agentes Especializados Integrados
1. **Research Agent (Agente de Pesquisa):** Consulta fontes, documentação oficial e repositórios.
2. **Coding Agent (Agente de Código):** Analisa código, gera alterações, propõe correções e avalia repositórios.
3. **UI/UX Agent (Agente de UI/UX):** Desenvolve layouts móveis futuristas usando Magic UI, Astra UI, Shadcn e Tailwind CSS.
4. **Deploy & DevOps Agent:** Configura pipelines e scripts de execução no celular via Termux ou Docker.
5. **Autonomous Agent (Agente Autônomo):** Executa sequências complexas sob limites configurados.
6. **Memory Agent (Agente de Memória):** Administra memórias persistentes, tags e recuperação por similaridade.
7. **Data Agent (Agente de Dados):** Analisa tabelas, arquivos estruturados e cálculos.
8. **Automation Agent (Agente de Automação):** Coordena rotinas, agendamentos e gatilhos.
9. **Voice Agent (Agente de Voz):** Trata comandos sonoros e sintetiza respostas via Web Speech API.
10. **Security Agent (Agente de Segurança):** Audita privilégios, detecta injeção de comandos e bloqueia riscos.
11. **Quality Agent (Agente de Qualidade):** Revisa respostas geradas e valida integridade.
12. **Custom Agents (Agentes Personalizados):** Permite criar agentes adicionais diretamente pela interface.

---

## 🛡️ Níveis de Autonomia & Segurança

- **Nível 1:** Somente Responder (nenhuma ferramenta externa é acionada).
- **Nível 2:** Planejar e Sugerir (exige aprovação humana prévia para cada ferramenta).
- **Nível 3:** Executar Ferramentas Locais (leituras autorizadas; bloqueio para destrutivas).
- **Nível 4 (Padrão):** Executar Fluxos Aprovados (aprovação exigida para deleções).
- **Nível 5:** Autônomo sob Guardrails (execução contínua com prevenção contra injeção de comandos).

---

## ⚡ AI Provider Hub

O JARVIS NEXUS desacopla a lógica dos agentes do fornecedor de IA:
- **Google Gemini 3.8 Flash:** Raciocínio de alta velocidade via SDK oficial `@google/genai` no backend.
- **Ollama Local / LAN:** Integração com Llama 3.3, Mistral e Gemma 2 em servidores locais sem custo de API.
- **llama.cpp no Celular:** Inferência direta no hardware móvel via Android Termux.
- **Motor Heurístico Local Offline:** Garante que o aplicativo nunca fique inoperante sem internet.

---

## 📱 Execução no Celular Android

### Modo PWA (Recomendado)
1. Acesse o aplicativo no navegador Google Chrome do Android.
2. Toque no menu de três pontinhos e selecione **"Adicionar à tela inicial"** ou **"Instalar aplicativo"**.
3. O JARVIS abrirá em modo standalone (tela cheia), sem barras de navegação do navegador.

### Modo Nativo via Termux
```bash
pkg update && pkg install nodejs git
git clone https://github.com/jarvis-nexus/jarvis-nexus.git
cd jarvis-nexus
npm install
npm run dev -- --host 0.0.0.0
# Abra no navegador do celular: http://localhost:3000
```

---

## 🧪 Testes de Lógica Pura

Execute os testes automatizados com o test runner nativo do Node 22+:
```bash
npm test
```

---

## 📄 Licenças e Atribuições
- **Licença:** MIT (código 100% permissivo para uso público).
- **Bibliotecas recomendadas:** Magic UI (MIT), Shadcn UI (MIT), Astra UI (MIT), Tailwind CSS (MIT), Lucide React (ISC).

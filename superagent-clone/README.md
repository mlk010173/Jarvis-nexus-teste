# Superagent Clone — núcleo open-source (custo zero)

Cópia funcional mínima do Superagent Base44 conforme os blueprints:
- **agent-api**: runtime do agente (loop LLM ⇄ tools), memória durável, endpoint de wake
- **sandbox**: container de execução (bash/arquivos/skills)
- **bridges**: WhatsApp Business Cloud API + Telegram Bot API
- **workflows**: gatilhos que acordam o agente (ex.: código GitHub no Gmail → WhatsApp)
- **frontend**: chat web mínimo

Subir tudo: `docker compose up -d` (precisa de Docker + 8GB RAM p/ Ollama).

Ordem de build detalhada: ver `blueprint-superagent-integracao-profunda.md`, Parte 5.

# n8n self-hosted (open-source) para orquestrar automações do JARVIS
FROM docker.n8n.io/n8nio/n8n:latest
USER root
RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node/.n8n
USER node
EXPOSE 5678
ENTRYPOINT ["tini", "--", "n8n", "start"]

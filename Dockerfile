# JARVIS NEXUS — imagem Docker do servidor online ao vivo
# Funciona em qualquer host com Docker (Fly.io, Koyeb, Railway, VPS, Termux com proot).
FROM node:22-alpine

WORKDIR /app

# Dependências (cache das camadas)
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Código + build do frontend
COPY . .
RUN npm run build

ENV NODE_ENV=production
# Render/Koyeb/Fly injetam PORT; default 3000 para uso local
ENV PORT=3000
EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]

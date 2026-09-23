# Mauves wave forecast website
FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl procps \
 && rm -rf /var/lib/apt/lists/*

ENV DATA_DIR=/data \
    PORT=3000 \
    TZ=Europe/Paris
RUN mkdir -p /data /app \
 && chown -R node:node /data /app

WORKDIR /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY --chown=node:node . .
RUN npm run build

EXPOSE 3000
VOLUME ["/data"]
CMD ["npm", "start"]

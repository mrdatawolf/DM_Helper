FROM node:20-bookworm-slim

# better-sqlite3 falls back to compiling from source if no prebuilt binary matches
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3002

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "src/server.js"]

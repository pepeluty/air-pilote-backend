# --- Build stage ---
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json nest-cli.json mikro-orm.config.ts ./
COPY src/ ./src/

RUN npm run build
# Compile the standalone MikroORM CLI config (not under src/, so nest build skips it)
RUN npx tsc mikro-orm.config.ts --outDir dist --module commonjs --target ES2022 --esModuleInterop --skipLibCheck

# --- Runtime stage ---
FROM node:22-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["sh", "-c", "npx mikro-orm migration:up --config dist/mikro-orm.config.js && node dist/main.js"]
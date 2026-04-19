# ── Stage 1: deps + prisma generate ────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl libc6-compat
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund && npx prisma generate

# ── Stage 2: builder (TypeScript -> JavaScript) ────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .
RUN npm run build
# Remove dev deps pra reduzir tamanho da imagem final
RUN npm prune --omit=dev && npx prisma generate

# ── Stage 3: runner (imagem final mínima) ─────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# OpenSSL pro Prisma + dumb-init pra SIGTERM graceful
RUN apk add --no-cache openssl libc6-compat dumb-init

# User não-root por segurança
RUN addgroup -g 1001 -S nodejs && adduser -S nest -u 1001
USER nest

COPY --chown=nest:nodejs --from=builder /app/dist ./dist
COPY --chown=nest:nodejs --from=builder /app/node_modules ./node_modules
COPY --chown=nest:nodejs --from=builder /app/prisma ./prisma
COPY --chown=nest:nodejs --from=builder /app/package.json ./

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Roda migrations + boot — se migration falha, app não sobe (fail-fast)
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]

# Milhas Extras ✈️

Agregador de preços de passagens aéreas por milhas para o mercado brasileiro.

Compara **Smiles · TudoAzul · Latam Pass** em qualquer rota, com estratégia de
cobertura em 5 camadas (live → cache → chart → síntese) e pipeline de
crowdsourcing que cresce com cada usuário.

## Visão rápida

```
┌──────────────────────────────────────────────────────────────┐
│  Mobile (Expo / React Native)                                 │
│    ├── Busca: FOR → GRU → retorna 3 programas em <2s         │
│    └── "Ver preço oficial" → WebView captura preços reais     │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTP
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Backend NestJS (porta 3001)                                  │
│    ├── FlightSearchService: 5-layer orchestrator              │
│    │   1. LRU memory <1ms                                     │
│    │   2. LiveFlightCache fresh (<24h)   → AO_VIVO            │
│    │   3. Scraper live (porta 3002)      → AO_VIVO            │
│    │   4. LiveFlightCache stale (<7d)    → ATUALIZADO         │
│    │   5. AwardChart estático            → REFERENCIA         │
│    │   6. Síntese por região IATA        → REFERENCIA         │
│    ├── Webhook /webhooks/scraper-result (GH Actions + mobile) │
│    └── Telemetria /hot-routes + /cache-stats                  │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Fontes de dados (multi-source, free tier)                   │
│    ├── AwardChart estático (~200 rotas curadas)               │
│    ├── GitHub Actions cron (IPs Azure, scrape tier A)         │
│    ├── Crowdsourcing WebView (user IP + cookies)              │
│    └── Síntese por região (fallback universal)                │
└──────────────────────────────────────────────────────────────┘
```

## Estrutura

```
Extramilhas/
├── backend/           NestJS + Prisma + SQLite (porta 3001)
├── admin/             Next.js 14 painel (porta 3000)
├── mobile/            Expo Router + React Native
├── scraper/           Playwright + stealth (porta 3002)
├── .github/
│   ├── workflows/     GitHub Actions cron
│   └── scripts/       Scraper standalone pra runners
└── docker-compose.yml
```

## Setup local

### Pré-requisitos

- Node.js 20+
- npm ou pnpm
- (Opcional) Redis pra BullMQ queues no scraper
- (Opcional) `gh` CLI + `ngrok` pra ativar o pipeline grátis

### 1. Backend

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev       # http://localhost:3001
```

Swagger: http://localhost:3001/api/docs

### 2. Admin

```bash
cd admin
npm install
npm run dev             # http://localhost:3000
```

Login dev: `admin@milhasextras.com.br` / `Admin@123`

### 3. Mobile

```bash
cd mobile
npm install
npx expo start
```

Pressione `a` pra Android emulator, `i` pra iOS simulator.

### 4. Scraper (opcional)

```bash
cd scraper
npm install
npx playwright install chromium
npm run start:dev       # http://localhost:3002
```

O scraper em IP residencial tem taxa de sucesso baixa (Akamai). Para
produção, ligue o pipeline grátis (abaixo).

## Pipeline de dados "Plano Grátis"

A arquitetura assume que scraping direto das 3 companhias é bloqueado
pela infra anti-bot delas. Então temos **5 multiplicadores grátis**:

| Camada | Ferramenta | Custo | O que faz |
|--------|-----------|-------|-----------|
| 1 | `playwright-extra` + stealth | R$ 0 | Browser pool + session persist no scraper local |
| 2 | **GitHub Actions cron** | R$ 0 (repo público) | Scrape em IPs Azure a cada 30 min |
| 3 | **Crowdsourcing WebView** | R$ 0 | Captura real usando IP+cookies do próprio usuário |
| 4 | Cloudflare Workers (opcional) | R$ 0 | Replay de sessão em edge distribuído |
| 5 | Enriquecimento OpenFlights | R$ 0 | Base de 70k rotas reais pra síntese |

Ver guia de ativação: `SETUP-GITHUB-ACTIONS.md`.

## Endpoints principais

### Público

- `POST /api/v1/simulator/search-flights` — busca de voos 5-camadas
- `GET  /api/v1/simulator/cache-stats` — telemetria do cache (fresco/stale/LRU)
- `GET  /api/v1/simulator/hot-routes?days=7&limit=30` — top rotas buscadas
- `POST /api/v1/webhooks/scraper-result` — recebe capturas de scrapers externos
  - Header `X-Scraper-Secret` (Actions) ou `crowdsourced-v1` (mobile)

### Admin (JWT requerido)

- `/admin/award-charts` — CRUD da tabela estática de resgate
- `/admin/offers` — CRUD de ofertas
- `/admin/users` — gestão de usuários
- UI em `http://localhost:3000/cache-stats` — dashboard do cache

## Env vars relevantes

`backend/.env`:
```env
DATABASE_URL="file:./dev.db"
PORT=3001
JWT_SECRET=dev-jwt-secret-milhasextras-2026
# Scraper microservice
SCRAPER_URL=http://localhost:3002
SCRAPER_ENABLED=true
SCRAPER_TIMEOUT_MS=10000
# Cache
FLIGHT_CACHE_FRESH_HOURS=24
FLIGHT_CACHE_STALE_HOURS=168
# Webhook (match no GitHub Secrets BACKEND_WEBHOOK_SECRET)
SCRAPER_WEBHOOK_SECRET=<openssl rand -hex 32>
```

`scraper/.env` (ou env vars do processo):
```env
REDIS_URL=redis://localhost:6379
REDIS_DISABLED=true   # se Redis não estiver rodando
POOL_MAX_USES=8
POOL_MAX_AGE_MS=1800000
STORAGE_MAX_AGE_MS=10800000
```

`mobile/.env`:
```env
# Deixe vazio pra fallback automático (iOS→localhost, Android→10.0.2.2)
EXPO_PUBLIC_API_URL=
```

## Observabilidade

### Em dev

- `GET /api/v1/simulator/cache-stats` — JSON com métricas
- `http://localhost:3000/cache-stats` — dashboard visual auto-refresh (30s)
- Logs do backend: NestJS com Logger por service
- Logs do scraper: `/api/stats` expõe metrics + pool info

### Em prod (roadmap)

- Grafana Cloud (free tier) com Loki + Prometheus
- Sentry pra erros RN
- PostHog pra analytics

## Migração SQLite → Postgres (produção)

Está em SQLite pra dev (zero-setup). Pra produção:

1. Troque `provider = "sqlite"` pra `"postgresql"` no `prisma/schema.prisma`
2. Setar `DATABASE_URL` pra Postgres (Supabase free tier funciona)
3. `npx prisma migrate deploy`

## Roadmap

Ver `plano-gratis-cobertura.md` em `.claude/plans/`. Resumo:

- [x] **Sem 1**: Stealth scraper + browser pool + session persist
- [x] **Sem 2**: GitHub Actions pipeline + webhook
- [x] **Crowdsourcing**: WebView in-app captura
- [x] **Opt-in ético** + telemetria SearchLog + admin dashboard
- [ ] **Sem 3**: Tier automation baseado em `/hot-routes`
- [ ] **Sem 4**: Import OpenFlights pra síntese precisa
- [ ] **Sem 5-6**: Cloudflare Workers edge (sessão warmup)
- [ ] Grafana dashboards

## Licença

TBD.

---

*Construído com NestJS, Next.js, Expo, Playwright, Prisma e muito café ☕*

# Milhas Extras — Arquitetura

Visão geral dos 4 componentes + banco, como eles conversam, e onde cada
feature vive. Atualizada em abril/2026.

## Componentes

```
┌──────────────────────┐    ┌──────────────────────┐
│  Landing (Next.js)   │    │   Admin (Next.js)    │
│  milhasextras.com.br │    │ admin.milhasextras.. │
│  • Captura waitlist  │    │  • Dashboard+stats   │
│  • /public/cpm live  │    │  • Reports fila      │
│  • Captura UTMs      │    │  • Programs/Offers   │
└────────┬─────────────┘    └──────────┬───────────┘
         │                             │
         │ GET /public/*               │ POST /admin/*
         │ POST /waitlist              │ auth: NextAuth
         └──────────────┬──────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Backend (NestJS, Fly.io)     │
        │  milhasextras-api.fly.dev     │
        │                               │
        │  Módulos principais:          │
        │  • auth/ users/ offers/       │
        │  • arbitrage/ calculator/     │
        │  • bonus-reports/ leaderboard/│
        │  • push/ (+whatsapp)          │
        │  • scheduler/ referral/       │
        │  • subscription/ (Stripe)     │
        │  • simulator/ (5-layer cache) │
        │  • admin/ notifications/      │
        └──────┬───────┬────────┬───────┘
               │       │        │
       ┌───────┘       │        └──────────┐
       │               │                   │
       ▼               ▼                   ▼
┌─────────────┐  ┌──────────┐   ┌───────────────────┐
│  Postgres   │  │  Expo    │   │  Scraper          │
│  Supabase   │  │  Push    │   │  (Playwright)     │
│  us-east-2  │  │  + Twilio│   │  :3002            │
└─────────────┘  └──────────┘   └───────────────────┘
                                          ▲
                                          │
                        ┌──────────────────┐
                        │  Mobile (Expo)   │
                        │  Android/iOS APK │
                        └──────────────────┘
```

## Banco (Postgres via Supabase)

Schema principal (abril/26):

| Model | Propósito |
|-------|-----------|
| `User` | auth, plano, referral code, lastActiveAt |
| `UserPreference` | programas favoritos, notifyBonus, notifyWhatsApp |
| `UserMilesBalance` | saldo por programa (indexado em userId) |
| `LoyaltyProgram` | Livelo/Smiles/TudoAzul/etc. com avgCpmCurrent |
| `Offer` | ofertas de bônus (feed + personalizadas) |
| `TransferPartnership` | pares from→to com currentBonus% e expiresAt |
| `Alert` / `AlertHistory` | alertas de usuário (limite por plano) |
| `BonusReport` | crowdsource: user reporta bônus → admin valida |
| `DeviceToken` | push token por device (cleanup >90d) |
| `AwardChart` | tabela de resgates manual (fallback do scraper) |
| `LiveFlightCache` | cache de scraper (fresh 24h / stale 7d) |
| `FamilyMember` | pool de milhas familiar |
| `ContentArticle` | blog/guias |
| `AuditLog` | trilha de ações admin |
| `WaitlistSignup` | captura landing |

Migrations em `backend/prisma/migrations/` — sequenciais, idempotentes.
Apply em prod via `flyctl deploy` (rola `prisma migrate deploy` no build).

## Flows críticos

### Aprovação de bônus reportado (coração do crowdsource)

```
Mobile: user reporta  →  POST /bonus-reports (status=PENDING)
                         ↓
                     Detect duplicate (24h, mesmo par) → DUPLICATE
                         ↓
                     PENDING → push pros admins
                         ↓
Admin: aprova        →  PUT /admin/bonus-reports/:id/approve
                         ↓
                     Cria/atualiza TransferPartnership ativa
                         ↓
                     Fire-and-forget broadcast respeitando prefs:
                       1. Push → devices com notifyBonus=true e
                          notifyProgramPairs match (ou vazio)
                       2. WhatsApp → users PRO verificados
                     + Push dedicado pro reporter (tier up?)
```

### Busca de voo (5-layer cache)

```
Request POST /simulator/search-flights
  → 1. LiveFlightCache FRESH (<24h) → AO_VIVO (cached)
  → 2. Scraper :3002 live (timeout 15s) → AO_VIVO (persisted)
  → 3. LiveFlightCache STALE (24h-7d) → ATUALIZADO (fallback)
  → 4. AwardChart manual → REFERENCIA
  → 5. Síntese por região (IATA→região) → REFERENCIA
```

### Paywall gate

```
Mobile → GET /arbitrage/transfer-bonuses
Backend:
  1. Fetch all opportunities (ordenado por ganho)
  2. Lookup user.subscriptionPlan + expiresAt
  3. Se FREE ou expirado: slice top 3, lockedCount=rest
  4. Response: {opportunities, lockedCount, plan, shouldUpsell}
Mobile:
  • Renderiza top 3 reais
  • Se shouldUpsell: banner violet→blue + 2 cards locked preview
  • Toque no banner → analytics('paywall_upgrade_clicked') → /subscription
```

## Schedulers (cron jobs internos)

Ativo automaticamente em prod. Override: `SCHEDULER_ENABLED=false`.

| Job | Horário | Função |
|-----|---------|--------|
| preWarmScraperCache | 3h UTC diário | Varre 26 rotas quentes → popula cache |
| reactivateInactiveUsers | Terça 10h UTC | Push pra inativos 14-28d com isca do maior bônus |
| cleanupDeadTokens | Domingo 4h UTC | Remove DeviceTokens >90d inativos |

## Push multi-canal

PushService + WhatsAppService trabalham em paralelo.

```
broadcastBonusAlert(pair, payload)
  ↓
  Fetch devices (lastUsedAt<60d) com user.preferences
  ↓
  Filtra: notifyBonus=true + (pairs vazio OR includes pair)
  ↓
  pushTargets = tokens que passaram no filtro
  whatsappTargets = phones de users PRO + notifyWhatsApp + verified
  ↓
  Promise.all:
    - PushService.sendToTokens(pushTargets) [Expo, 100/chunk]
    - WhatsAppService.broadcast(phones) [Twilio, serializado 1/s]
```

## Analytics pipeline

Mobile (`src/lib/analytics.ts`): PostHog RN, init no _layout.tsx.
Backend (`common/analytics.service.ts`): posthog-node, @Global module.

Eventos canônicos:
- `auth_login` / `auth_register` / `auth_logout`
- `paywall_shown` / `paywall_upgrade_clicked`
- `bonus_report_created` / `bonus_report_approved`
- `referral_shared` / `referral_applied`
- `push_permission_granted` / `push_notification_opened`
- `subscription_checkout_started` / `subscription_activated`

Sem key → no-op silencioso (dev).

## Secrets por ambiente

Dev (`.env` local): pode rodar tudo com mocks, só `DATABASE_URL`+`JWT_SECRET` obrigatórios.

Prod (Fly.io secrets): todos os `*_API_KEY` devem ser setados explicitamente.
Config em `configuration.ts` **throws** se JWT_SECRET faltar em NODE_ENV=production.

Lista atual (abril/26):
- Obrigatórios: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
- Opt-in: `STRIPE_*` (6), `TWILIO_*` (4), `POSTHOG_API_KEY`, `SENDGRID_API_KEY`,
  `EXPO_ACCESS_TOKEN`, `SCRAPER_URL`, `SCHEDULER_ENABLED`, `CORS_ORIGINS`

## Decisões arquiteturais

1. **Postgres unificado** (vs SQLite+Postgres misto): 1 banco, 1 source of truth.
2. **NestJS modular** (vs monolito solto): facilita adicionar features
   cross-cutting (push, analytics) via module injection.
3. **Expo managed workflow** (vs bare RN): EAS build remoto, sem precisar
   Android Studio/Xcode. Trade-off: menos controle de native code.
4. **Supabase** (vs Fly Postgres / RDS): backups + dashboard grátis no tier dev.
   Em scale move pra Neon ou Fly Postgres (pgcluster).
5. **Fly.io backend** (vs AWS/GCP): 1 dyno em gru, autoscale gratis,
   fly secrets = devex melhor que AWS SSM.
6. **Scraper separado :3002** (vs embed no backend): Playwright + stealth
   é pesado e tem perfil de memória diferente. Isolar facilita restart
   independente e evitar OOM no backend API.
7. **PostHog (vs Mixpanel/GA)**: self-host opcional, eventos server-side
   baratos, feature flags no mesmo console.
8. **Crowdsource como feature core**: cada user que reporta bônus é um
   "sensor" no mundo. Reduz dependência de scraping → cresce qualidade
   enquanto user base cresce. Tier + ranking + push dedicado mantém o loop.

## Onde adicionar X

- Nova feature visível no mobile: `mobile/app/<screen>.tsx` + hook em
  `mobile/src/hooks/useX.ts` + registro no `mobile/app/_layout.tsx` Stack
- Endpoint novo backend: `backend/src/<domain>/<domain>.module.ts`
  (controller+service+module) + importa no `app.module.ts`
- Push em novo evento: injeta `PushService` via module, chama
  `sendToUser` ou `broadcastBonusAlert`
- Cron novo: adiciona método `@Cron(...)` em `SchedulerService`
- Widget público no site: endpoint `/public/*` no backend + componente
  em `landing/app/components/`

## Onde NÃO mexer sem ler

- `backend/src/simulator/flight-search.service.ts` — orquestra 5 layers
- `backend/src/subscription/subscription.service.ts` — webhook Stripe
  é idempotente-ish, mexer com cuidado
- `backend/prisma/schema.prisma` + migrations — sempre gerar migration
  via `prisma migrate dev --create-only`, nunca editar DB direto

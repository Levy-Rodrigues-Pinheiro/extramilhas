# Deploy playbook — Milhas Extras

Guia passo-a-passo pra deploy seguro. Endereça bugs #1, #10, #12 do
HONEST_TEST_REPORT.

## Setup único (first time)

```bash
# Instalar flyctl
curl -L https://fly.io/install.sh | sh
# Adicionar ao PATH (bash/zsh)
export FLYCTL_INSTALL="/c/Users/SAP/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"

# Login
fly auth login

# Linkar ao app existente
cd backend
fly status
```

## Secrets necessários no Fly

```bash
fly secrets set \
  DATABASE_URL="postgresql://..." \
  DIRECT_URL="postgresql://..." \
  JWT_SECRET="$(openssl rand -base64 32)" \
  JWT_REFRESH_SECRET="$(openssl rand -base64 32)" \
  SCHEDULER_ENABLED=true \
  NODE_ENV=production
```

Opcionais (ligam features específicas):
```bash
fly secrets set \
  STRIPE_SECRET_KEY="sk_live_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \
  SENTRY_DSN="https://..." \
  SCRAPER_URL="https://scraper.internal:3002" \
  EXPO_ACCESS_TOKEN="..." \
  OTEL_ENABLED=true \
  OTEL_EXPORTER_OTLP_ENDPOINT="https://..."
```

## Deploy padrão

```bash
cd backend

# 1. Pre-deploy sanity check
./scripts/pre-deploy-check.sh

# 2. Deploy (--remote-only compila no Fly, mais rápido)
fly deploy --remote-only

# 3. Smoke test
curl https://milhasextras-api.fly.dev/api/v1/health
```

O Dockerfile já:
- Roda `prisma generate` 2x (stage deps + após prune)
- Executa `prisma migrate deploy` no CMD — se migration falha, app não
  sobe (fail-fast). Evita bug de schema dessincronizado.

## Checklist pós-deploy (Smoke test manual)

Rodar na ordem. Se QUALQUER item falhar, rollback.

```bash
API="https://milhasextras-api.fly.dev/api/v1"

# Health
curl "$API/health" | jq .
# Esperado: { "status": "ok", ... }

# Endpoints públicos
curl "$API/programs" | jq '. | length'
curl "$API/travel-intel/alliances" | jq '. | length'
curl "$API/leaderboard/reporters?limit=5" | jq .
curl "$API/quizzes" | jq '.data | length'
curl "$API/podcast" | jq '.data | length'
curl "$API/guides" | jq .

# Autenticado (precisa JWT real)
TOKEN="..."
curl "$API/users/profile" -H "Authorization: Bearer $TOKEN" | jq .
curl "$API/engagement/streak" -H "Authorization: Bearer $TOKEN" | jq .
curl "$API/portfolio/analyze" -H "Authorization: Bearer $TOKEN" | jq .
curl "$API/bookmarks" -H "Authorization: Bearer $TOKEN" | jq .
```

## Rollback

Se smoke test falha ou Sentry spammar:
```bash
fly releases list
fly releases rollback <PREV_VERSION>
```

Fly mantém últimas 10 releases. Rollback em <30s.

## Troubleshooting

### "Prisma Client is not generated"
- Causa: build Docker pulou `prisma generate`
- Fix: `fly deploy --no-cache --remote-only` — força rebuild limpo

### "Migration failed to apply"
- Causa: DB tem drift que prisma migrate deploy não reconhece
- Fix: `fly ssh console` → `npx prisma migrate status` → resolver manual

### "Cron not firing"
- Causa: `SCHEDULER_ENABLED` false ou NODE_ENV != production
- Fix: `fly secrets set SCHEDULER_ENABLED=true` + restart

### "5xx rate spike"
- Conferir Sentry primeiro
- `fly logs -a milhasextras-api` pra ver stack traces
- Se crítico, rollback imediato

## Migrations novas na última sprint (14)

Aplicadas automaticamente pelo CMD:
- `20260420050000_add_trial_started_at`
- `20260420060000_add_last_expiration_alert_at`
- `20260420070000_add_offer_reviews`
- `20260420080000_add_feature_flags_streaks_goals`
- `20260421010000_add_streak_rewards_and_ugc`
- `20260421020000_add_security_events`
- `20260421030000_add_group_buys_trip_swaps`
- `20260421040000_add_notes_public_profile`
- `20260421050000_add_credit_cards_and_api_keys`
- `20260421060000_add_mentorship_events`
- `20260421070000_add_wallet_snapshots_saved_filters`
- `20260421080000_add_trip_plans_recurring`
- `20260421090000_add_bookmarks_achievements`
- `20260421100000_add_newsletter_contact`
- `20260421110000_add_quizzes`
- `20260421120000_add_badges_activity`
- `20260421130000_add_platform_infra`
- `20260421140000_add_podcast`

Total: ~40 tabelas novas. Se DB prod tem drift, `migrate deploy` vai
reportar erro específico — aí ver Troubleshooting.

## Mobile (EAS build)

Bloqueado até **01/mai/2026** (quota free reset).

```bash
cd mobile
eas build -p android --profile preview
# Aguarda ~15min build
# Baixa APK do link retornado

eas build -p ios --profile preview
# iOS só com conta Apple Developer pago
```

# Deploy

## Backend (Fly.io)

```bash
cd backend
flyctl deploy --remote-only
```

Deploy completo: ~3-5min. O que rola:
1. Fly builda docker image usando `Dockerfile` (multi-stage)
2. Push pra registry
3. Release command: `npx prisma migrate deploy` (aplica migrations pendentes)
4. Start: `node dist/src/main.js`
5. Health check em `/api/v1/health` — se não responder, rollback

Smoke test pós-deploy:
```bash
bash tests/e2e/backend-smoke.sh
```

## Admin (Vercel)

Auto-deploy em qualquer push pra `main` que toca em `admin/*`.

Variáveis necessárias no Vercel Dashboard:
- `NEXT_PUBLIC_API_URL` = `https://milhasextras-api.fly.dev/api/v1`
- `NEXTAUTH_SECRET` = gera com `openssl rand -base64 32`
- `NEXTAUTH_URL` = `https://admin.seudominio.com`

## Landing (Vercel)

Igual ao admin. Preview em toda PR.

## Web (Vercel, novo — `web/`)

```bash
cd web && vercel --prod
```

## Mobile (EAS Build)

```bash
cd mobile
EXPO_TOKEN=xxx eas build --platform android --profile preview --non-interactive --no-wait
```

Build demora ~5-8min na EAS cloud. Status:
```bash
eas build:list --platform android --limit 3
```

APK download via dashboard expo.dev ou via URL do campo `buildUrl`.

## Production checklist

Antes de declarar produção:

### Backend
- [ ] `JWT_SECRET` + `JWT_REFRESH_SECRET` setados na Fly
- [ ] `DATABASE_URL` + `DIRECT_URL` apontando pro Postgres prod
- [ ] `CORS_ORIGINS` whitelist explícita (sem fallback `*`)
- [ ] `SENTRY_DSN` setado (opcional mas recomendado)
- [ ] `ANTHROPIC_API_KEY` se Intel Agent ativo
- [ ] `SCHEDULER_ENABLED=true` (ou deixar inferir de NODE_ENV)

### Mobile
- [ ] `EXPO_PUBLIC_API_URL` aponta prod em `eas.json` profile preview/production
- [ ] `app.json` version bump
- [ ] APK testado em ≥2 devices antes de release
- [ ] Upload na Play Store: build com profile `production` (não `preview`)

### Landing/Admin
- [ ] Google Search Console verificado
- [ ] `robots.txt` + `sitemap.xml` acessíveis (`/robots.txt` e `/sitemap.xml`)

## Rollback

```bash
flyctl releases --app milhasextras-api
flyctl releases rollback <version> --app milhasextras-api
```

Rollback é quase-instantâneo (reutiliza image anterior). **Não desfaz
migrations** — cuidado quando migration foi breaking.

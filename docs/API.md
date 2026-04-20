# API Reference (principais)

Backend em `https://milhasextras-api.fly.dev/api/v1`. Swagger UI em
`/api/docs` (dev). Todas rotas retornam shape `{ success, data, ... }`.

## Autenticação

- `POST /auth/register` { name, email, password }
- `POST /auth/login` { email, password }
- `POST /auth/refresh` { refreshToken }
- `POST /auth/forgot-password` { email } (stub — vide SENDGRID)
- `POST /auth/reset-password` { token, password }

Retornos: `{ accessToken, refreshToken, user }`. Usar `Bearer <accessToken>`.

## Públicos (CORS *, cacheável)

- `GET /health` — liveness
- `GET /health/live` — k8s liveness
- `GET /health/ready` — k8s readiness (checa DB)
- `GET /health/extended` — counts + integrations flags
- `GET /health/mem` — memória + process info
- `GET /public/cpm` — CPM atual por programa
- `GET /public/bonuses` — transferências com bônus ativo
- `GET /public/stats` — total users/bonuses (social proof)
- `GET /bonus-reports/recent?days=30` — bônus aprovados recentes
- `GET /bonus-reports/stats` — counts agregados
- `GET /leaderboard/reporters?limit=20&window=all|month`
- `POST /bonus-reports` — reportar bônus (anônimo permitido)
- `POST /devices/register` — device push token
- `DELETE /devices/unregister`

## Arbitragem

- `GET /arbitrage/transfer-bonuses` — oportunidades (gate FREE/PREMIUM)
- `POST /arbitrage/calculate` — calcula ganho transferindo X

## User (auth)

- `GET /users/me`
- `PUT /users/profile` { name }
- `PUT /users/password` { currentPassword, newPassword }
- `DELETE /users/me` { confirmEmail } — LGPD delete
- `GET /users/family` / `POST /users/family` / `DELETE /users/family/:id`
- `GET /users/preferences` / `PUT /users/preferences`

## Notificações (auth)

- `GET /notifications-feed` — lista + unreadCount
- `PUT /notifications-feed/:id/read`
- `POST /notifications-feed/read-all`
- `GET /notifications/preferences`
- `PUT /notifications/preferences`
- `POST /notifications/verify-start` { phone }
- `POST /notifications/verify-confirm` { code }

## Missions (auth)

- `GET /missions` — minhas missões com progresso
- `POST /missions/:id/claim` — resgata reward (Premium days)

## Referral (auth)

- `GET /referral/me` — code + stats
- `POST /referral/apply` { code }

## Alerts (auth)

- `GET /alerts` — meus alertas
- `POST /alerts` { type, conditions, channels }
  - types: CPM_THRESHOLD | DESTINATION | PROGRAM_PROMO | BONUS_THRESHOLD
- `PUT /alerts/:id`
- `DELETE /alerts/:id`
- `POST /alerts/deactivate-all`

## Admin (auth + isAdmin)

- `GET /admin/dashboard` — métricas
- `GET /admin/users` / `GET /admin/users/:id` (enriched)
- `PUT /admin/users/:id/plan` { plan }
- `GET /admin/bonus-reports?status=PENDING|APPROVED|REJECTED`
- `POST /admin/bonus-reports` — criar manual
- `PUT /admin/bonus-reports/:id/approve|reject|undo`
- `POST /admin/bonus-reports/bulk` { ids[], action }
- Intel Agent: `GET /admin/intel-agent/sources|runs|summary`
  `POST /admin/intel-agent/run/:id|run-all|preview|sources`
- `POST /admin/notifications/broadcast` { title, body, targetPlan, deepLink }
- `GET /admin/export/users.csv|bonus-reports.csv|partnerships.csv`
- `GET /admin/audit-logs?limit=50&action=SNAPSHOT`
- `GET /admin/debug/status|snapshots`
- `POST /admin/debug/throw` — testa Sentry

## Subscription (auth)

- `GET /subscription`
- `POST /subscription/checkout` { plan, period }
- `POST /subscription/portal`
- `POST /subscription/cancel`
- `POST /subscription/webhook` (Stripe)

## Rate limits

- Público default: 10 req/s, 50 req/10s, 200 req/min (short/medium/long)
- `/bonus-reports` POST: 5 req/hora (anti-spam)
- `/admin/intel-agent/run/:id`: 10/min
- `/admin/intel-agent/run-all`: 2/min
- `/admin/intel-agent/preview`: 20/min

## Errors

Forma padrão quando falha:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "mensagem amigável",
  "code": "P2002",
  "timestamp": "2026-04-20T12:34:56.789Z"
}
```

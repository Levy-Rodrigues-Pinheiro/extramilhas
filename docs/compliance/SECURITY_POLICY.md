# Security Policy — Milhas Extras

**Última atualização:** 2026-04-21
**Owner:** security@milhasextras.com.br

## Escopo
Este documento cobre a infraestrutura e aplicação Milhas Extras (backend
NestJS em Fly.io, Postgres em Supabase, mobile Expo, landing Next.js).

## Autenticação & autorização
- **JWT bearer tokens** via HS256. Secret em `JWT_SECRET` (Fly secret).
- **Refresh tokens** hasheados com bcrypt custo 12, armazenados em `User.refreshToken`.
- **RBAC** por flag `User.isAdmin`. Roles guard valida em controllers admin.
- **Admin impersonation** (30min, sem refresh token, com `impersonatedBy`
  no payload do JWT, auditado em `AuditLog`).

## Proteção de credenciais
- **Passwords**: bcrypt custo 12. Nunca logadas em plaintext.
- **API keys** (public API): hash SHA-256 em DB, plaintext retornado apenas
  na criação (não recuperável depois).
- **Webhook secrets**: hex 32 bytes, mesmo pattern que API keys.

## Criptografia em trânsito
- HTTPS obrigatório via Fly proxy (Let's Encrypt auto-renovável).
- HSTS header via headers middleware (`max-age=31536000; includeSubDomains`).

## Criptografia em repouso
- Postgres no Supabase com encryption at rest (AES-256).
- Backups diários automáticos mantidos 7d (free tier); 30d em prod Pro.

## Rate limiting
- Global throttle via `@nestjs/throttler` (60 req/min por IP default).
- Decorators `@Throttle` aplicados em endpoints sensíveis (auth, contact form).
- `SecurityEvent` com eventType=RATE_LIMIT_HIT grava tentativas bloqueadas.

## Anti-fraud
Ver `src/security/security.service.ts`. Rule-based engine que flagga:
- 5+ LOGIN_FAIL mesmo IP em 10min → riskScore 60
- 3+ REGISTER_OK mesmo IP em 1h → riskScore 50
- 10+ ALERT_CREATE mesmo user em 5min → riskScore 40 (bot suspect)
- UA vazio/curl/wget/python-requests → +20
- riskScore ≥70 loga warn; ≥90 pode auto-bloquear (feature flag)

## Audit log
- `AuditLog` grava ações admin (USER_PLAN_CHANGE, IMPERSONATE, SET_BADGES,
  REFUND, SNAPSHOT daily, etc).
- Retenção 12 meses. Export CSV via `GET /admin/audit-log/export` (admin-only).

## Incident response
Ver [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md).

## Vulnerability disclosure
- Reporte via security@milhasextras.com.br ou `POST /contact` com category=BUG.
- SLA: ack em 48h; fix crítico em 7d; fix normal em 30d.
- Safe harbor: não processamos reports em boa-fé que sigam responsible disclosure.

## Dependências
- `npm audit` semanal automatizado via CI (TODO).
- Deps críticas (jwt, bcrypt, prisma) atualizadas em <30d da release.

## SOC 2 status
Roadmap estabelecido; processo formal ainda não iniciado. Controles básicos
(authn, authz, encryption, audit, monitoring) implementados. Ver
[SOC2_ROADMAP.md](./SOC2_ROADMAP.md) pra gaps.

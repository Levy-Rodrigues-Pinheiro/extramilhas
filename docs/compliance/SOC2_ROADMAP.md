# SOC 2 Type II — Roadmap

Este app ainda NÃO tem certificação SOC 2 Type II. Esse documento lista
os controles, status atual, e o que falta pra iniciar processo formal
(typicamente com Drata/Vanta).

## Trust Service Criteria

### CC1 — Control Environment
- [x] Código-base versionado (Git)
- [x] RBAC implementado (User.isAdmin + Roles guard)
- [ ] Employee onboarding/offboarding checklist formal
- [ ] Background checks (não aplicável ainda — solo founder)

### CC2 — Communication & Information
- [x] Privacy policy publicada (milhasextras.com.br/privacidade)
- [x] Terms of service publicados
- [x] Security policy interna (docs/compliance/SECURITY_POLICY.md)
- [ ] Security training anual documentada

### CC3 — Risk Assessment
- [x] Anti-fraud engine rule-based
- [x] SecurityEvent log com risk scoring
- [ ] Risk assessment formal documentado (matriz)
- [ ] Threat model por feature crítica

### CC4 — Monitoring Activities
- [x] Sentry pra errors
- [x] PostHog pra analytics (opt-in via env)
- [x] AuditLog pra ações admin
- [x] SLO dashboard básico (/slo/status)
- [ ] SIEM formal (Datadog/Splunk)
- [ ] On-call rotation formal

### CC5 — Control Activities
- [x] JWT auth
- [x] Rate limiting global
- [x] HTTPS enforced
- [x] Encryption at rest (Supabase)
- [x] Audit log 12m retention
- [ ] MFA obrigatório pra admin
- [ ] VPN/IP allowlist pra ops

### CC6 — Logical & Physical Access Controls
- [x] Password bcrypt 12
- [x] API keys hashed
- [x] Admin impersonation auditado
- [ ] Hardware security keys pra admin
- [ ] Zero-trust network

### CC7 — System Operations
- [x] Automated backups (Supabase)
- [x] Restore procedure documentado (parcial)
- [ ] DR drill anual
- [ ] Capacity planning formal

### CC8 — Change Management
- [x] Git commits + PRs
- [x] Type-checking em cada commit (pre-deploy)
- [x] Migrations Prisma versionadas
- [ ] CI/CD gates automatizados (smoke tests pré-prod)
- [ ] Change advisory board

### CC9 — Risk Mitigation
- [x] Incident response plan documentado
- [x] Data retention policy documentada
- [ ] Vendor risk assessments (Stripe, Supabase, Fly, etc)
- [ ] Cyber insurance

## Processo pra iniciar SOC 2 formal

**Estimativa**: 6-12 meses + ~R$ 40-80k/ano em custos.

### Mês 1-2: Assessment
- Contratar Drata/Vanta (~R$ 1500/mês) ou ~Secureframe
- Gap analysis completo
- Assign controls owners

### Mês 3-4: Remediation
- Implementar controles faltando (CI/CD gates, MFA, etc)
- Documentar policies formalmente (10-15 docs)

### Mês 5-6: Audit pre-check
- Type I audit (ponto no tempo) — ~R$ 15-25k one-time
- Correções dos achados

### Mês 7-12: Type II observation window
- 6-12 meses de operação contínua com controles ativos
- Type II audit final — ~R$ 25-50k one-time
- Certificação emitida

## Próximo passo recomendado
Quando atingir ~R$ 50k/mês de MRR ou primeiro cliente enterprise:
- Contratar Drata/Vanta trial
- Rodar gap analysis
- Priorizar remediation baseado no gap

# Incident Response Plan

## Severity
| Level | Exemplo | SLA ack | SLA mitigate |
|-------|---------|---------|--------------|
| SEV1 | Breach, DB corrompido, API fora 15min+ | 15min | 1h |
| SEV2 | Feature crítica quebrada pra >10% users | 1h | 4h |
| SEV3 | Bug chato, workaround possível | 8h | 48h |
| SEV4 | Cosmetic | — | 7d |

## Trigger points
- Sentry error rate ≥ 5× baseline (alert via email)
- SLO burn rate ≥ 10× (alert futuro via page)
- AuditLog SNAPSHOT detecta queda anômala de counts
- Mais de 3 contact forms category=BUG em 1h com mesma feature

## Roles
- **IC (Incident Commander)**: decide next steps. Normalmente o founder.
- **Ops**: investiga infra/db.
- **Comms**: atualiza status page + users afetados.

## Playbook resumido
1. **Detect**: alert dispara ou user reporta.
2. **Triage** (5min): SEV level? escopo? Crie chat dedicado (WhatsApp/Discord).
3. **Mitigate**: rollback > feature flag kill > hotfix. Prefira restore sobre fix.
4. **Comms**: status.milhasextras.com.br (TODO) + push banner pros afetados.
5. **Postmortem**: docs em docs/postmortems/YYYY-MM-DD.md, blameless.

## Data breach (se ocorrer)
- **ANPD (LGPD)**: notificar em até 2 dias úteis via e-mail se dados pessoais
  afetados. Contato: comunicados@anpd.gov.br.
- **Users afetados**: push + email dentro de 72h explicando o que vazou, o
  que fizemos, o que user deve fazer.
- **Logs forenses**: SecurityEvent, audit_logs, e logs Pino agregados.
- **Rotate**: JWT_SECRET, Prisma creds, Stripe keys, se comprometidos.

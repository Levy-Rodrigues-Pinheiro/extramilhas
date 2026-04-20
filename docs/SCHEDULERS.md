# Schedulers — cron jobs do backend

Todos rodam via `@nestjs/schedule` no `SchedulerService`. Default:
ativo em `NODE_ENV=production`. Override via env `SCHEDULER_ENABLED=false`.

Timezone: **UTC**. BRT = UTC - 3h.

| Cron | Horário UTC | Horário BRT | Função |
|------|-------------|-------------|--------|
| `0 3 * * *` | **3h00 diário** | 00h00 | Pre-warm scraper cache (26 rotas populares) |
| `0 3 * * 0` | **3h00 domingo** | 00h00 dom | Cleanup `LiveFlightCache` >30d |
| `0 4 * * 0` | **4h00 domingo** | 01h00 dom | Cleanup `DeviceToken` >90d inativo |
| `0 5 * * *` | **5h00 diário** | 02h00 | Expira `TransferPartnership` vencidas |
| `0 6 * * *` | **6h00 diário** | 03h00 | Snapshot counts (canary data loss) |
| `0 10 * * 2` | **10h00 terça** | 07h00 ter | Reactivation push pra inativos 14-28d |
| `0 10 * * 5` | **10h00 sexta** | 07h00 sex | Weekly digest push |
| `0 */2 * * *` | **cada 2h** | — | Intel Agent varre fontes ativas |

## Custos por job

- **Pre-warm (3h)**: 26 rotas × timeout 20s = ~9min. Depende do scraper.
- **Intel Agent (2h)**: ~5 fontes × $0.002 LLM (c/ hash cache skip ~85%) = ~$0.09/dia
- **Digest sexta**: broadcast pra N devices; Expo Push é grátis
- **Cleanup**: queries simples, custo desprezível

## Override por ambiente

```bash
# Desliga TUDO (dev)
SCHEDULER_ENABLED=false

# Desliga só o agente (mantém outros)
INTEL_AGENT_ENABLED=false

# Desliga scraper (cascade: pre-warm não faz nada)
SCRAPER_ENABLED=false
```

## Mudando horário

Edita `@Cron(...)` no `SchedulerService`. Formato padrão cron de 5 campos.
Redeploy → novo schedule ativo imediato.

## Debugging

Logs de cada job aparecem com prefixo `[SchedulerService]` via Pino.
Pra ver em prod: `flyctl logs --app milhasextras-api | grep SchedulerService`.

# Data Retention Policy

## Princípios
- **Minimização**: coletamos só o necessário pra o produto.
- **Time-bound**: TTL definido em cada tipo de dado; cleanup automatizado.
- **User-driven deletion**: LGPD art. 18 — user pode pedir delete total.

## Tabelas e retenção

| Tabela | Dado | TTL |
|--------|------|-----|
| `users` | Conta user | Até delete request ou 5 anos inativo |
| `user_miles_balances` | Saldos | Segue user |
| `notifications` | Push in-app | 90 dias |
| `alert_histories` | Trigger history | 180 dias |
| `price_histories` | CPM por dia/programa | Indefinido (agregado, não-pessoal) |
| `search_logs` | Buscas | 90 dias (anonimiza userId → null depois de 90d) |
| `audit_logs` | Ações admin | 12 meses |
| `security_events` | Eventos suspeitos | 90 dias |
| `live_flight_cache` | Cache scraper | 30 dias (cron semanal limpa >30d) |
| `wallet_snapshots` | Histórico de carteira | 2 anos |
| `activities` | Timeline social | 90 dias |
| `device_tokens` | Push tokens | Cron semanal remove inativos >90d |
| `contact_messages` | Form contato público | 1 ano |
| `waitlist_signups` | Pre-launch | Até convertido ou 2 anos |

## Delete account (LGPD art. 18)
`DELETE /users/profile` (JWT):
1. Hard-delete de: alerts, balances, notifications, saved_offers, bookmarks,
   goals, notes, guides do user, forum posts do user, mentorship profile.
2. Soft-anonymize de user: email → `deleted-{uuid}@milhasextras.com.br`,
   name → "Usuário removido", passwordHash → null, refreshToken → null,
   publicUsername → null.
3. Grava AuditLog.
4. Response: confirmação + link pra recovery em 30d (se user mudar de ideia).

## Data export (LGPD art. 15)
`GET /users/dashboard/export` (CSV) — carteira, alertas, notificações últimas 500,
family members.

## Bank account / financial data
**Não coletamos**: nunca pedimos número de cartão, CPF, ou credenciais de
programas de milhas. App trabalha com saldos declarados pelo user.
Futura integração Open Finance respeitará redirect+consent OAuth BCB.

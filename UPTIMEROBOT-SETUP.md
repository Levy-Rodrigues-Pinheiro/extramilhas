# UptimeRobot — Setup em 5 minutos

Monitor externo grátis pra saber **quando o backend cai** antes de qualquer usuário reclamar.

## Passo 1 — Criar conta (1 min)

1. Acesse **https://uptimerobot.com/signUp**
2. Sign up com email (ou GitHub)
3. Plano: **Free** (50 monitors, check a cada 5 min)

## Passo 2 — Adicionar monitor (2 min)

No dashboard:

1. Clique **+ New monitor**
2. **Monitor Type:** `HTTP(s)`
3. **Friendly Name:** `Milhas Extras API — health/deep`
4. **URL:** `https://milhasextras-api.fly.dev/api/v1/health/deep`
5. **Monitoring Interval:** `5 minutes`
6. **Monitor Timeout:** `30 seconds` (Fly cold start)
7. **HTTP Method:** GET
8. **Alert Conditions:**
   - Notify when down for: `5 minutes` (evita falso positivo de cold start)
   - Notify when up: ✅
9. Clique **Create Monitor**

## Passo 3 — Configurar alertas (2 min)

### Opção A — Email (default)
Já vem por padrão — vai pro seu email cadastrado.

### Opção B — Discord webhook (recomendado)
Notificação instantânea no celular sem precisar abrir email:

1. No Discord, crie um servidor pessoal (ou use existente)
2. Server Settings → Integrations → Webhooks → New Webhook
3. Copie a URL do webhook
4. No UptimeRobot: My Settings → **Alert Contacts** → Add → **Webhook**
5. Cole a URL, formato:
   ```
   POST https://discord.com/api/webhooks/.../...
   Body:
   {"content":"🚨 *monitorFriendlyName* está *alertType* — *alertDetails*"}
   ```

### Opção C — WhatsApp via Twilio
Pago (~R$ 0.05 por mensagem), mas mais imediato. Free tier UptimeRobot não inclui SMS.

## Passo 4 — Adicionar monitores extras

Mesmo processo pra:

| Monitor | URL |
|---------|-----|
| Landing | `https://milhasextras-landing.vercel.app` |
| Admin | `https://milhasextras-admin.vercel.app` |
| Webhook signup | `https://milhasextras-api.fly.dev/api/v1/health` (200 OK indireto) |

## Métricas observadas em produção

Depois de 1-2 dias coletando:

- **Uptime %**: meta >99.5%
- **Response time avg**: meta <2s (cold start counts)
- **Incidents count**: meta 0/semana

## Custo

- UptimeRobot Free: 50 monitors, R$ 0/mês
- Email/Discord webhook: R$ 0
- (Opcional) Twilio SMS: ~R$ 0.05 por alerta

## Quando upgrade

- **Pro tier ($7/mês)**: check a cada 1min (vs 5min), 10s timeout, mais alert contacts.
- Vale a pena quando passar de 1k usuários ativos / dia.

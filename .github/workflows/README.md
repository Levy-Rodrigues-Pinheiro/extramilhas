# GitHub Actions — Scrapers

## Como configurar

Este repo usa GitHub Actions como "fazenda de scrapers grátis". Os runners do
Actions têm IPs da Microsoft Azure, que Smiles/Azul/LATAM não bloqueiam (ao
contrário de IPs residenciais que são facilmente banidos).

### 1. Setup dos secrets

Vá em **Settings → Secrets and variables → Actions** e adicione:

| Secret | Valor | Como gerar |
|--------|-------|------------|
| `BACKEND_WEBHOOK_URL` | URL completa do webhook | Ex: `https://api.seu-dominio.com/api/v1/webhooks/scraper-result` |
| `BACKEND_WEBHOOK_SECRET` | String aleatória (≥32 bytes) | `openssl rand -hex 32` |

O mesmo valor de `BACKEND_WEBHOOK_SECRET` precisa estar como `SCRAPER_WEBHOOK_SECRET`
no `.env` do backend em produção.

### 2. Limites do plano grátis

| Tipo de repo | Limite |
|--------------|--------|
| **Público** | Minutos **ilimitados** ← recomendado |
| **Privado** | 2.000 min/mês |

Se o repo for privado, cada run (5 origens × 4 min = 20 min) × 48 runs/dia = 28.800 min/mês.
**Passa do limite.** Opções:
- Tornar o repo público (recomendado)
- Reduzir frequência do cron pra `0 */3 * * *` (a cada 3h)
- Reduzir matriz de origens pra 2-3

### 3. Validação manual

Antes de ativar o cron, rode manualmente:

1. Vá em **Actions → Scrape Hot Routes → Run workflow**
2. Clique "Run workflow"
3. Veja os logs de cada origem
4. Confira que o webhook retornou HTTP 201 e que `saved > 0`

### 4. Monitorar cobertura

No backend, use `GET /api/v1/admin/cache-stats` (a criar) pra ver quantas rotas
têm dados frescos. Meta semana 4:
- 300+ rotas Tier A com dados <1h
- Coverage rate AO_VIVO > 40%

## Arquivos

- `workflows/scrape-hot-routes.yml` — cron + matriz de origens
- `scripts/scrape-routes.mjs` — script standalone (Playwright + stealth)
- `scripts/package.json` — deps mínimas

## Troubleshooting

**"Webhook HTTP 401"** → secret errado. Confira que `BACKEND_WEBHOOK_SECRET` no repo
é idêntico ao `SCRAPER_WEBHOOK_SECRET` no backend.

**"Webhook HTTP 500"** → backend com erro. Cheque logs do NestJS.

**"0 flights found"** → Akamai bloqueou também. Azure IPs funcionam ~60% do tempo.
Normal ter algumas execuções vazias. Próximo cron vai pegar.

**Job dura >6h** → runner morto. `timeout: 60` no workflow (TODO: adicionar).

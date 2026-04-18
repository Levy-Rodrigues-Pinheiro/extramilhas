# Guia passo-a-passo: Ativar GitHub Actions scrapers

Este guia assume que você tem:
- Uma conta GitHub (se não, crie em https://github.com/signup)
- O Git instalado na máquina (você já tem — git bash)
- Seu backend rodando localmente na porta 3001

Tempo total: ~20 minutos.

---

## Passo 1 — Criar `.gitignore`

Antes de qualquer commit, blindar arquivos que não devem ir pro GitHub:

```bash
cd /c/Users/SAP/Extramilhas
```

Crie o arquivo `.gitignore` com este conteúdo (copia e cola no terminal):

```bash
cat > .gitignore <<'EOF'
# Dependências
node_modules/
*/node_modules/

# Builds
dist/
*/dist/
.next/
*/.next/

# Envs (NUNCA commitar — contém secrets)
.env
*/.env
.env.local
*/.env.local

# DB local
*.db
*.db-journal
*/prisma/dev.db
*/prisma/dev.db-journal

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Sessions do scraper (cookies capturados)
scraper/data/sessions/

# Metro/Expo
.expo/
*/.expo/

# Build artifacts
*.tsbuildinfo
EOF
echo "gitignore criado"
```

---

## Passo 2 — Inicializar git + commit

```bash
cd /c/Users/SAP/Extramilhas

git init
git branch -M main

# Configura identidade (use seu email do GitHub)
git config user.email "seu-email@exemplo.com"
git config user.name "Seu Nome"

# Primeiro commit
git add .
git commit -m "Initial commit"
```

Se der algum erro de "filename too long" no Windows:
```bash
git config core.longpaths true
```
e rode `git add .` de novo.

---

## Passo 3 — Criar o repo no GitHub

**Opção A — Via navegador (mais simples):**

1. Vá em https://github.com/new
2. **Repository name:** `extramilhas` (ou o nome que preferir)
3. **Visibility:** escolha **Public**
   - ⚠️ **Importante:** só repo público tem minutos ilimitados de Actions.
   - Privado = só 2.000 min/mês (não dá pra rodar cron de 30min)
4. **NÃO** marque "Add README", "Add .gitignore" ou "License" — a gente já tem tudo localmente
5. Clique **Create repository**

Na página seguinte o GitHub mostra comandos. Use os da seção **"…or push an existing repository from the command line"**. Algo assim:

```bash
git remote add origin https://github.com/SEU_USUARIO/extramilhas.git
git push -u origin main
```

Quando pedir login, o GitHub hoje exige **Personal Access Token** em vez de senha:
1. Vá em https://github.com/settings/tokens/new
2. Note: "git push local"
3. Expiration: 90 dias
4. Scopes: marque **repo**
5. Gere e **copia o token** (ele só aparece uma vez)
6. Quando `git push` pedir senha, cola o token

---

## Passo 4 — Expor o backend publicamente (ngrok)

GitHub Actions roda na nuvem, então não alcança `localhost:3001` da sua máquina. Precisamos expor.

**Instalar ngrok** (grátis):
1. Baixe em https://ngrok.com/download (versão Windows)
2. Extraia o `ngrok.exe` em qualquer pasta (ex: `C:\Users\SAP\Tools\`)
3. Crie conta grátis em https://dashboard.ngrok.com/signup
4. Pegue seu **authtoken** em https://dashboard.ngrok.com/get-started/your-authtoken
5. Configure:
   ```bash
   /c/Users/SAP/Tools/ngrok.exe config add-authtoken SEU_TOKEN_AQUI
   ```

**Subir o túnel** (deixa esse terminal aberto enquanto testa):
```bash
/c/Users/SAP/Tools/ngrok.exe http 3001
```

Vai aparecer algo como:
```
Forwarding  https://abc-123-456.ngrok-free.app -> http://localhost:3001
```

A URL `https://abc-123-456.ngrok-free.app` é a URL pública do seu backend. **Copia.**

O seu webhook público fica:
```
https://abc-123-456.ngrok-free.app/api/v1/webhooks/scraper-result
```

> ⚠️ URL do ngrok muda a cada vez que você sobe. Pra produção de verdade, use Railway/Render/Fly.io (também têm free tier). Pra testar agora, ngrok serve.

---

## Passo 5 — Configurar secrets no GitHub

No seu repo do GitHub:

1. Vá em **Settings → Secrets and variables → Actions** (menu lateral esquerdo)
2. Clique **New repository secret**
3. Adicione 2 secrets:

**Secret 1:**
- Name: `BACKEND_WEBHOOK_URL`
- Value: `https://abc-123-456.ngrok-free.app/api/v1/webhooks/scraper-result` *(a URL do ngrok)*

**Secret 2:**
- Name: `BACKEND_WEBHOOK_SECRET`
- Value: `dev-webhook-secret-change-me-in-prod-2026` *(o mesmo que está no `backend/.env`)*

⚠️ O valor tem que ser **idêntico** ao `SCRAPER_WEBHOOK_SECRET` do `backend/.env`.

---

## Passo 6 — Trigger manual do primeiro run

Antes do cron de 30min começar, teste manual:

1. No repo GitHub, clique na aba **Actions**
2. Na lateral esquerda, clique **Scrape Hot Routes (Tier A)**
3. Botão **Run workflow** (direito) → **Run workflow** (verde)
4. Aguarde ~5 minutos
5. Clique no run em andamento pra ver os logs de cada origem (GRU, GIG, BSB, CNF, SSA)

O que você quer ver nos logs:
```
✓ smiles GRU-GIG: 3 flights
✓ tudoazul GRU-GIG: 2 flights
...
Webhook HTTP 201: {"success":true,"saved":10,...}
```

Se aparecer `0 flights` em todas rotas, Akamai bloqueou essa origem específica — normal ter algumas vazias. O cron seguinte vai pegar outras.

Se aparecer `Webhook HTTP 401` → secret errado. Confira que o secret no GitHub é idêntico ao do `backend/.env`.

Se aparecer `Webhook HTTP 500` ou timeout → ngrok caiu ou backend com erro. Veja logs do NestJS.

---

## Passo 7 — Verificar que o cache populou

Depois do run manual, volte no backend e busque uma das rotas que foi scrapeada:

```bash
curl -s -X POST http://localhost:3001/api/v1/simulator/search-flights \
  -H "Content-Type: application/json" \
  -d '{"origin":"GRU","destination":"GIG","departDate":"2026-07-20","cabinClass":"economy","passengers":1}'
```

Se aparecer `dataQuality: "AO_VIVO"` e `source: "cache_fresh"` em algum resultado → **FUNCIONOU**. Os dados vêm direto do scrape do GitHub Actions.

Se continuar `synthetic_estimate` → o scrape falhou (Akamai). Rode de novo em algumas horas.

---

## Passo 8 — Ativar o cron

Depois que o trigger manual funcionou pelo menos uma vez, o cron `*/30 * * * *` já está ativo automaticamente. Ele vai rodar sozinho a cada 30min.

Você pode ver os runs em **Actions → All workflows**.

---

## Troubleshooting rápido

| Problema | Solução |
|----------|---------|
| `git push` pede senha e rejeita | Use Personal Access Token (passo 3) |
| Runner falha com "Chromium not found" | O workflow já tem `npx playwright install` — se falhar, rode o workflow de novo |
| Todas rotas retornam 0 flights | Akamai. Espera 2-3 runs; alguma hora passa |
| ngrok derrubado após 8h grátis | Plano free tem sessão de 8h. Reinicia quando cair, URL muda |
| Quero que funcione sem ngrok sempre ligado | Deploy permanente: Railway (railway.app), Render (render.com) ou Fly.io — todos com free tier |

---

## Resumo visual do fluxo

```
GitHub Actions (cron */30)
        │
        ├─ runners Azure (IPs limpos)
        │
        ▼
Playwright + stealth → scrape sites
        │
        ▼
POST webhook https://seu-backend/api/v1/webhooks/scraper-result
        │  header: X-Scraper-Secret: <BACKEND_WEBHOOK_SECRET>
        ▼
Backend valida secret + persiste em LiveFlightCache
        │
        ▼
Próxima busca do usuário → lê do cache → dataQuality=AO_VIVO
```

---

## Quando for pra produção de verdade

- [ ] Trocar `SCRAPER_WEBHOOK_SECRET` por `openssl rand -hex 32`
- [ ] Substituir ngrok por deploy permanente (Railway/Render/Fly.io)
- [ ] Atualizar URL do secret `BACKEND_WEBHOOK_URL` no GitHub
- [ ] Migrar DB do SQLite pra Postgres (Supabase free tier)
- [ ] Configurar Sentry/Grafana Cloud pra monitoramento

Mas pra validar agora, o fluxo acima é suficiente.

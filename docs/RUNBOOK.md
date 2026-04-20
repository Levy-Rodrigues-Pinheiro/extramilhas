# Runbook — operações comuns

Checklist de resposta a situações recorrentes. Atualize quando adicionar
um comando novo ou descobrir um bug não óbvio.

## 🚨 Backend fora do ar

1. Check Fly status:
   ```bash
   flyctl status --app milhasextras-api
   ```
2. Se `CHECKS: critical`, ver logs:
   ```bash
   flyctl logs --app milhasextras-api --no-tail | tail -50
   ```
3. Bug comum: crash no boot por DI missing. Grep `Nest can't resolve`.
4. Rollback último deploy:
   ```bash
   flyctl releases --app milhasextras-api
   flyctl releases rollback <version> --app milhasextras-api
   ```

## 🔁 Re-deploy manual

```bash
cd backend
flyctl deploy --remote-only
```

Deploy demora ~3-5min. Monitor de live-check:
```bash
curl -s -w "%{http_code}\n" https://milhasextras-api.fly.dev/api/v1/health/live
```

## 🗄️ Migration nova

```bash
cd backend
# Cria migration (precisa shell interativo pro prompt de nome)
npx prisma migrate dev --name add_coluna_x

# Em prod (auto no fly deploy, ou manual):
npx prisma migrate deploy
```

## 🔑 Setar secret na Fly

```bash
flyctl secrets set NOME_DA_VAR="valor" --app milhasextras-api
```
Redeploy automático após `secrets set`.

## 📱 Build APK manual

```bash
cd mobile
EXPO_TOKEN=$EXPO_TOKEN eas build --platform android --profile preview --non-interactive --no-wait
```

Status via `eas build:list --platform android --limit 3`.

## 🤖 Intel Agent rodar agora

Via UI admin: `/intel-agent` → "Rodar todas".

Via CLI (token admin):
```bash
curl -X POST https://milhasextras-api.fly.dev/api/v1/admin/intel-agent/run-all \
  -H "Authorization: Bearer $TOKEN"
```

## 💰 Ver custo LLM acumulado

```bash
curl -s https://milhasextras-api.fly.dev/api/v1/admin/intel-agent/summary \
  -H "Authorization: Bearer $TOKEN" | jq
```
Campo `totalCostUsd` e `costPerApprovedUsd`.

## 📊 Smoke test contra prod

```bash
bash tests/e2e/backend-smoke.sh
```
Retorna exit 1 se algum endpoint falhar.

## 🧹 Limpar dados de teste

```sql
-- Remove bonus reports de teste
DELETE FROM bonus_reports WHERE reporterEmail LIKE 'smoketest%';

-- Remove device tokens sintéticos
DELETE FROM device_tokens WHERE token LIKE 'invalid-%' OR token LIKE 'test-%';
```

## 📬 Checar queue de reports pendentes

`GET /admin/bonus-reports?status=PENDING` — se crescer demais, chamar
IntelAgentService.autoDisableLowAccuracySources manualmente, ou ajustar
prompt do LLM.

## 🆘 Recuperar admin sem senha

```bash
cd backend
SEED_ADMIN_PASSWORD="nova-senha-forte" npx ts-node prisma/reset-admin-password.ts
```

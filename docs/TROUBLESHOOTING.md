# Troubleshooting

Problemas comuns + como resolver.

## Backend

### "Nest can't resolve dependencies of XService"
Causa: service novo requer dep que não foi importada no module dele.
Fix: adicione o module da dep em `imports: []` do seu module.

### `EPERM: operation not permitted, rename ... query_engine.dll.node`
Windows-only. Dev server rodando prende o DLL quando `prisma generate` tenta
regenerar. Fix:
1. Fecha o `npm run start:dev`
2. Roda `npx prisma generate`
3. Reinicia dev server

Em prod (Fly) isso nunca acontece — build roda fresh.

### `P1001: Can't reach database server`
Supabase free tier dorme após 5min idle. Primeira query acorda (pode
demorar 10-30s). Retry.

### "JWT_SECRET é obrigatório em produção"
Fail-fast novo em `configuration.ts`. Setar:
```bash
flyctl secrets set JWT_SECRET="string-aleatorio-64-chars" JWT_REFRESH_SECRET="outro"
```

## Mobile

### `expo-localization` / build falha "peer dep"
Versão do pacote incompatível com SDK. Usar sempre:
```bash
npx expo install <pacote>
```
Que escolhe versão correta pro SDK do projeto.

### Deep link não abre app
1. Verifica `app.json` tem `scheme: "milhasextras"` + intentFilters Android
2. APK precisa ter `autoVerify: true` + arquivo `.well-known/assetlinks.json`
   no dominio (gerado via Play Console depois do primeiro upload)

### Push não chega
1. Device registrado? Check `/admin/devices/stats`
2. `ExpoPushToken` válido? Verifica em `/admin/debug/throw` — se não chegou,
   checa permissões do device (Settings)
3. Prod: verifica se `notifyBonus` = true nas prefs do user
4. Expo access token: opcional, mas aumenta throughput

## Admin

### 401 em tudo
Session expirou. Fazer logout e login novo. NextAuth não refresh silently.

### CSV download abre no browser em vez de salvar
Cabeçalho Content-Disposition tá certo. Provavelmente browser configurado
pra "open" esse MIME. Renomear .csv → vai baixar.

## Landing / Web

### OG image não aparece no WhatsApp
WhatsApp cacheia agressivamente. Testar via Facebook Debugger:
https://developers.facebook.com/tools/debug/ → "Scrape again".

### FAQ schema.org não gera rich result no Google
Precisa ter indexação há alguns dias + domain authority mínima. Google
Search Console pode forçar reindex do URL.

## Intel Agent

### Agente não extrai nada (hasRelevantKeywords=false sempre)
Fonte pode estar bloqueando bot (403 ou HTML vazio). Testa pela
preview tool em `/admin/intel-agent` → "Testar URL".

### LLM retorna JSON inválido
Check `llmOutputRaw` no run detail — se começa com ``` ou texto,
o system prompt precisa reforço. Editar `llm-extractor.service.ts`.

### Custo Anthropic explodiu
Check `/admin/intel-agent/summary` → `totalCostUsd`. Se passa $5/dia,
algo tá errado: feat hash cache pode ter falhado, ou scopeSelector
enorme (> 50k chars). Auto-disable pra fontes de baixa accuracy já
deveria pegar os piores.

## Stripe (quando ativo)

### Webhook 400 "Invalid signature"
`STRIPE_WEBHOOK_SECRET` é diferente entre test mode e live mode.
Confere qual endpoint você configurou no Stripe Dashboard e qual
secret ta na Fly.

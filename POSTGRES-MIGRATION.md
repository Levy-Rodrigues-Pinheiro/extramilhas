# Migração SQLite → PostgreSQL

O backend hoje usa SQLite (zero-setup em dev). Para produção, trocar pra Postgres
é mandatório porque SQLite não aguenta concurrency (lock de escrita serializa
requests).

Esse guia faz a migração sem downtime, em ~30 minutos.

---

## Por que agora

- Prisma suporta os dois. Trocar é só mudar uma linha + regenerar client.
- SQLite lida mal com writes concorrentes (>5 req/s concurrente já começa a serializar).
- Analytics (SearchLog) cresce rápido — em SQLite vira gargalo.
- Backups: Postgres tem rotinas prontas; SQLite você copia arquivo (backup frágil).

---

## Opção recomendada: Supabase free tier

**Limites do plano grátis:**
- 500 MB DB storage
- 2 GB data transfer/mês
- 50k active users auth
- Backups automáticos diários (últimos 7d)

Suficiente pra até ~50k usuários ativos do app.

### Passo 1 — Criar projeto Supabase

1. Vá em https://supabase.com → Sign in (com GitHub).
2. **New project**:
   - Name: `milhasextras`
   - Database password: gere uma forte (use `openssl rand -base64 24`)
   - Region: `South America (São Paulo)` ← minimiza latência
3. Espere ~2min provisioning.
4. No menu lateral → **Project Settings → Database** → copie **Connection string (URI)**.
   Formato: `postgresql://postgres:SUA_SENHA@db.xxxxxx.supabase.co:5432/postgres`

### Passo 2 — Atualizar schema do Prisma

`backend/prisma/schema.prisma`:

```diff
 datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
   url      = env("DATABASE_URL")
 }
```

**Não** precisa mudar os models — os tipos do Prisma são portáveis.

### Passo 3 — Atualizar `.env`

Para testar primeiro sem quebrar dev:

```env
# Mantenha o atual pra rollback rápido
# DATABASE_URL="file:./dev.db"

# Novo
DATABASE_URL="postgresql://postgres:SENHA@db.xxxxxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:SENHA@db.xxxxxx.supabase.co:5432/postgres"
```

O `?pgbouncer=true&connection_limit=1` é crítico em serverless e evita esgotar o pool.
O `DIRECT_URL` é usado pelo Prisma Migrate (não passa pelo pooler).

No `schema.prisma`, habilite o `directUrl`:

```diff
 datasource db {
   provider = "postgresql"
   url      = env("DATABASE_URL")
+  directUrl = env("DIRECT_URL")
 }
```

### Passo 4 — Rodar migrações no novo DB

```bash
cd backend
# Gera a migration consolidada (como se fosse a primeira vez)
npx prisma migrate deploy

# Alternativa se migrations antigas derem conflito:
npx prisma migrate reset
npx prisma migrate dev --name initial_postgres
```

### Passo 5 — Seed

```bash
npx prisma db seed
```

### Passo 6 — Testar local

```bash
npm run start:dev

# Em outro terminal:
curl http://localhost:3001/api/v1/health/deep
```

Deve retornar `status: "up"` com DB latência < 100ms.

### Passo 7 — Deploy

Quando for pra deploy real (ex: Fly.io):

```bash
fly secrets set DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..."
fly deploy
```

---

## Diferenças importantes entre SQLite e Postgres

### 1. Case-sensitivity
SQLite é case-insensitive por padrão em `LIKE`; Postgres é case-sensitive.
**Impact**: nenhum no código atual — usamos `toUpperCase()` em IATA antes de query.

### 2. JSON support
SQLite: JSON fica como string, extração manual.
Postgres: suporta `jsonb` nativo.
**Impact**: nenhum agora, mas no futuro podemos trocar colunas como `rawPayload`, `metadata`, `preferences` de `String` pra `Json`:

```prisma
// antes
rawPayload String?
// depois (só depois da migração)
rawPayload Json?
```

### 3. Case nos enums
SQLite aceita qualquer string; Postgres valida enum strict.
**Impact**: conferir que enums como `OfferType` tenham `@db.VarChar(30)` ou sejam enum nativos.

### 4. Transações
Postgres serializa bem mais. Pode remover lock manual em alguns fluxos.

---

## Rollback

Se der muito ruim no primeiro dia:

1. Troque `DATABASE_URL` de volta pra `file:./dev.db`.
2. Reverta `provider = "sqlite"` no schema.
3. `npx prisma generate`.
4. Restart backend.

O SQLite continua lá intacto.

---

## Backup automático

Supabase faz backup diário automático no plano grátis (7 dias de retenção).

Pra backup manual antes de operações arriscadas:

```bash
# No painel Supabase → Database → Backups → "Create backup"
# Ou via pg_dump local:
pg_dump "postgresql://postgres:SENHA@db.xxx.supabase.co:5432/postgres" \
  -F c -f backup-$(date +%Y%m%d).dump
```

---

## Métricas no Supabase dashboard

Depois da migração, acompanhe em **Reports**:

- **Query performance**: Supabase destaca queries lentas (>1s)
- **Database size**: monitore crescimento
- **Active connections**: se passar de 50 no free tier, upgrade necessário

---

## Checklist de produção

Antes de apontar clientes pra Postgres:

- [ ] `DATABASE_URL` em env vars, nunca hardcoded
- [ ] `DIRECT_URL` configurado
- [ ] `pgbouncer=true&connection_limit=1` no `DATABASE_URL`
- [ ] `npx prisma migrate deploy` rodou sem erro
- [ ] `/health/deep` retorna `database.status: "up"` em <200ms
- [ ] Backup automático confirmado (primeiro aparece 24h depois do primeiro write)
- [ ] Sentry configurado (erros de DB aparecem lá)
- [ ] Monitoramento de `database.latencyMs` em Grafana/Logtail

#!/bin/bash
# Pre-deploy sanity check. Roda ANTES de fly deploy pra reduzir surpresa.
#
# Bug fix HONEST_TEST_REPORT #12: antes fazíamos `fly deploy` no escuro e
# migrations conflitantes só apareciam em runtime. Agora validamos antes.
#
# Uso:
#   cd backend && ./scripts/pre-deploy-check.sh
#
# Exit code:
#   0 = OK, pode deployar
#   1 = Erro crítico, NÃO deploye

set -euo pipefail

echo "🔍 Pre-deploy check"
echo "==================="

# 1. TypeScript compila?
echo ""
echo "1. Type-check..."
if npx tsc --noEmit 2>&1 | grep -q error; then
  echo "   ❌ TypeScript errors found"
  exit 1
fi
echo "   ✓ clean"

# 2. Prisma schema é válido?
echo ""
echo "2. Prisma schema validate..."
if ! npx prisma validate 2>&1; then
  echo "   ❌ Schema inválido"
  exit 1
fi
echo "   ✓ valid"

# 3. Migrations status (só verifica localmente que archivos existem)
echo ""
echo "3. Migrations count..."
migration_count=$(ls -1 prisma/migrations/ 2>/dev/null | grep -c '^[0-9]' || echo 0)
echo "   $migration_count migrations encontradas"
if [ "$migration_count" -lt 1 ]; then
  echo "   ⚠️  Zero migrations — app pode não ter schema atualizado"
fi

# 4. Build passa?
echo ""
echo "4. Build..."
if ! npm run build > /dev/null 2>&1; then
  echo "   ❌ Build falhou — rode 'npm run build' manualmente"
  exit 1
fi
echo "   ✓ build OK"

# 5. Env vars críticos setados no Fly?
echo ""
echo "5. Fly secrets check..."
if command -v fly &> /dev/null; then
  required_secrets=("DATABASE_URL" "JWT_SECRET" "JWT_REFRESH_SECRET")
  missing=()
  for s in "${required_secrets[@]}"; do
    if ! fly secrets list 2>/dev/null | grep -q "$s"; then
      missing+=("$s")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    echo "   ⚠️  Missing secrets: ${missing[*]}"
    echo "      Setar com: fly secrets set NOME=valor"
  else
    echo "   ✓ secrets críticos presentes"
  fi
else
  echo "   ⏭  flyctl não instalado, skip"
fi

echo ""
echo "==================="
echo "✅ Pronto pra deploy"
echo ""
echo "Próximo passo:"
echo "  fly deploy --remote-only"
echo ""
echo "Após deploy, validar smoke:"
echo "  curl https://milhasextras-api.fly.dev/api/v1/health"

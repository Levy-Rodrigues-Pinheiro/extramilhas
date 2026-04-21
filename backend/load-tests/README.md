# Load tests (k6)

Testes de carga pros endpoints críticos do Milhas Extras. Roda via k6 CLI
ou integrado em CI (k6 Cloud).

## Instalação
```bash
# macOS
brew install k6
# Windows (via choco)
choco install k6
# Docker (qualquer plataforma)
docker pull grafana/k6
```

## Rodando localmente
```bash
# Smoke — 1 VU por 30s pra validar que endpoints respondem
k6 run load-tests/smoke.js

# Load — ramp-up até 50 VUs por 5 min, mede latência p95/p99
k6 run load-tests/load.js

# Stress — busca o teto; 0 → 200 VUs em 10 min, procura breaking point
k6 run load-tests/stress.js

# Spike — simula viralização: pico 500 VUs em 30s, mede recovery
k6 run load-tests/spike.js
```

## Variáveis de ambiente
```bash
export API_BASE=https://milhasextras-api.fly.dev/api/v1
export API_AUTH_TOKEN="<jwt-de-test-user>"
```

## SLOs definidos (p99)
- GET /programs: 200ms
- GET /arbitrage/transfer-bonuses: 400ms
- POST /arbitrage/calculate: 800ms
- POST /simulator/destinations: 2000ms (com scraper fallback)

Os scripts falham se threshold violado — útil como gate em CI.

## Integração com CI
```yaml
# .github/workflows/load-test.yml
- name: Run k6 smoke on deploy
  run: k6 run load-tests/smoke.js
  env:
    API_BASE: ${{ secrets.API_BASE }}
    API_AUTH_TOKEN: ${{ secrets.API_AUTH_TOKEN }}
```

Thresholds fazem exit code 99 se violados — CI fail natural.

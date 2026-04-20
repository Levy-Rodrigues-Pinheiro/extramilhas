# Contribuindo

Obrigado por querer ajudar! Pra onboarding rápido:

## Setup local

```bash
git clone https://github.com/Levy-Rodrigues-Pinheiro/extramilhas
cd extramilhas

# Backend
cd backend && npm install
cp .env.example .env  # edita DATABASE_URL + JWT_SECRET no mínimo
npx prisma migrate deploy
npm run start:dev

# Mobile (em outro terminal)
cd mobile && npm install
npx expo start

# Admin (em outro terminal)
cd admin && npm install
npm run dev
```

## Antes de abrir PR

1. `npm test` no backend (24 unit tests devem passar)
2. `npx tsc --noEmit` em cada sub-projeto (backend, mobile, admin, landing, web)
3. `bash tests/e2e/backend-smoke.sh` (opcional, precisa prod rodando)

## Style

- Commits no imperativo português ("Adiciona X" > "Added X")
- Branch naming: `feat/nome-curto`, `fix/nome-curto`, `docs/nome-curto`
- PRs pequenos e focados — se virar >300 linhas, considera quebrar

## Arquitetura

Ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pra diagramas + flows.

## Discussões

Features novas ou mudanças arquiteturais: abre issue antes de gastar
tempo codando. Bug fixes e polish: PR direto, sem issue.

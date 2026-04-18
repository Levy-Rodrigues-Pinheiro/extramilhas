# MilhasTop 🛫

Agregador de ofertas de milhas aéreas do mercado brasileiro.

## Estrutura do Projeto

```
Extramilhas/
├── backend/      NestJS API (porta 3001)
├── admin/        Painel Admin Next.js (porta 3000)
├── mobile/       App React Native com Expo
├── scraper/      Microserviço de coleta de ofertas
└── docker-compose.yml
```

## Pré-requisitos

- Node.js 20+
- Docker e Docker Compose
- (Mobile) Expo Go no celular ou emulador

---

## 🚀 Como Rodar

### 1. Banco de dados e Redis

```bash
docker-compose up postgres redis -d
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env.local
# Edite .env.local com suas configurações

npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```

API disponível em: http://localhost:3001/api/v1
Swagger docs: http://localhost:3001/api/docs

### 3. Admin Panel

```bash
cd admin
npm install
cp .env.local.example .env.local   # já existe como .env.local
npm run dev
```

Painel disponível em: http://localhost:3000
Login: admin@milhastop.com.br / Admin@123

### 4. Mobile (Expo)

```bash
cd mobile
npm install
npx expo start
```

Escaneie o QR code com o app Expo Go ou pressione `a` (Android) / `i` (iOS).

### 5. Scraper

```bash
cd scraper
npm install
npx prisma generate
npm run start:dev
```

---

## 🔑 Credenciais de Desenvolvimento

| Serviço | Usuário | Senha |
|---------|---------|-------|
| Admin Panel | admin@milhastop.com.br | Admin@123 |
| PostgreSQL | milhastop | milhastop_pass |

---

## 📱 Funcionalidades MVP

- [x] Autenticação (email, Google)
- [x] Feed de ofertas com filtros
- [x] Alertas personalizados de CPM
- [x] Histórico de preços por programa
- [x] Simulador de destinos por milhas
- [x] Comparador de programas
- [x] Calculadora de CPM
- [x] Painel administrativo completo
- [x] Scraper automático (mock em dev)
- [x] Sistema de notificações (push + in-app)
- [x] Planos de assinatura (FREE / PREMIUM / PRO)

---

## 🌐 Variáveis de Ambiente Necessárias

Veja `.env.example` na raiz para a lista completa. As principais:

```env
DATABASE_URL=postgresql://milhastop:milhastop_pass@localhost:5432/milhastop_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=mude_em_producao_minimo_32_chars
STRIPE_SECRET_KEY=sk_test_...        # Para pagamentos
SENDGRID_API_KEY=...                  # Para emails
FIREBASE_PROJECT_ID=...              # Para push notifications
```

---

## 📦 Deploy com Docker

```bash
# Subir todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f backend

# Rebuild após alterações
docker-compose up -d --build backend
```

---

## 🏗️ Arquitetura

```
Mobile App (Expo)
      ↕ REST API
NestJS Backend ←→ PostgreSQL
      ↕               ↕
    Redis          Scraper
   (cache/        (cron jobs,
    filas)         coleta dados)
      ↕
Admin Panel (Next.js)
```

---

*Construído com NestJS, Next.js, React Native (Expo), PostgreSQL, Redis e Prisma.*

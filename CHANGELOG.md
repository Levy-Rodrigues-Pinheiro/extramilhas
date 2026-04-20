# Changelog

Todos os commits de mudanças relevantes. Versionamento semântico solto —
a versão do backend tá nas tags Fly; a do mobile no `app.json`.

## [1.0.1] — abril/2026

### Acumulado desta grande sessão (100+ features em ~28 commits)

#### 🔔 Engajamento
- Push Notifications (Expo) + WhatsApp (Twilio) com opt-in verificado SMS
- Notification Center in-app com histórico + unread badge
- Tab bar badge + bell icon no home header
- Preferências granulares (master switch + filtro por pares from:to)
- Digest semanal (sexta 10h UTC)
- Reactivation cron pra inativos 14-28d

#### 🏆 Gamificação
- Leaderboard all-time + mensal, tiers BRONZE→PLATINUM
- Missions com reward em dias Premium (3 seeds iniciais)
- Referral 30d Premium pra ambos, deep-link /r/[code], prefill no register

#### 💰 Arbitragem
- Calculadora "vale a pena transferir?"
- Gate Premium: FREE vê top 3, Premium vê tudo (preview ofuscado)
- Histórico timeline 7/30/90d com stats
- Share WhatsApp por oportunidade
- Alertas BONUS_THRESHOLD por par + % mínimo

#### 🤖 Intel Agent (crawlers inteligentes)
- 5 sources HTML seedadas (Melhores Destinos, PP, Livelo, etc.)
- Telegram adapter (t.me/s scraping)
- LLM extraction via Claude Haiku com pré-filtro local
- Smart dedup (intra-run + DB-wide fuzzy ±5%)
- Content hash cache (85% economia de custo)
- Auto-disable sources de baixa accuracy (<20% após 10 reviews)
- Preview/test tool antes de salvar fonte
- LLM output raw salvo pra debug
- Accuracy por source + cost per approved

#### 💳 Monetização (Stripe infra)
- Checkout session + webhook handler
- Customer tracking via stripeCustomerId
- Portal Stripe pra user gerenciar assinatura
- Fix annual expiration bug
- Guia completo em docs/STRIPE_SETUP.md

#### 📊 Admin
- Dashboard com stats enriched (growth, crowdsource, push, accuracy)
- Intel Agent: lista + run detail expansível com LLM output
- Bulk approve/reject reports
- Manual create report (admin dica via WhatsApp)
- Undo approve/reject com cleanup de partnership
- User detail page enriquecida (wallet R$, accuracy, referrals)
- CSV exports: users, bonus-reports, partnerships
- Audit Logs viewer com filter por action
- Diagnostics page (health/status/snapshots/memory)

#### 🛡️ Ops & segurança
- JWT secrets obrigatórios em prod (fail-fast no boot)
- CORS allowlist restrita em prod
- Rate limiting granular nas rotas custosas do agente
- Prisma exception filter (P2002/P2025/P2003 traduzidos)
- Graceful shutdown hooks
- Health /live /ready /mem endpoints
- Sentry real integration + debug endpoints
- Snapshot diário de counts (canary data loss)
- Cron cleanup: dead tokens 90d + old flight cache 30d
- Expiração automática de bônus
- GitHub Actions smoke tests 2×/dia + pós-CI

#### 🌍 i18n & Localization
- pt-BR + en-US com expo-localization detect device

#### 📱 Mobile polish
- Onboarding quiz 4 steps (programas → saldos → push → welcome)
- First-run tips persistidos (home + arbitrage)
- Skeleton + EmptyState + OfflineBanner components
- Haptic feedback em ações importantes
- Edit profile (nome + trocar senha + share app)
- Delete account LGPD compliant
- Version footer
- Share opportunity no WhatsApp
- Deep link Android App Links (milhasextras.com.br/r/*)

#### 🌐 Landing
- Widget LiveBonuses + SocialProofStats
- Testimonials + ComparisonTable
- FAQ com schema.org JSON-LD
- /privacy + /terms + /contato
- robots.ts + sitemap.ts dinâmicos
- OG image dinâmica (Next ImageResponse)
- ConsentBanner LGPD
- Footer links (privacy/terms/contato/github)

#### 🖥️ Web app (novo, /web)
- Next.js SSR consumindo /public/cpm + /public/bonuses
- Tabela CPM ordenada por melhor + cards de bônus ativos

#### 🧪 Tests & docs
- 24 unit tests passing (tier math + LLM filter)
- tests/e2e/backend-smoke.sh (13 checks contra prod)
- docs/ARCHITECTURE.md + docs/STRIPE_SETUP.md

## [1.0.0] — abril/2026
- Release inicial

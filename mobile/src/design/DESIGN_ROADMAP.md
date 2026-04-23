# Design Roadmap — Milhas Extras

**Visão:** um app que a Apple orgulhosamente colocaria na seção **Apps We Love**. Não é "redesign" — é **elevação sistemática**: cada área com identidade própria, cada tela com um *signature moment* que o usuário vai lembrar.

---

## 🎯 Princípios não-negociáveis

1. **Nothing generic.** Se parece com outro app, refaz. Milhas Extras não é Shadcn Next SaaS #7832.
2. **Every screen has a signature moment.** Uma interação/animação específica que define aquela tela.
3. **Feel before function.** A função está lá. O que entrega valor emocional é o *feel*.
4. **Native first.** O app deve sentir como se a Apple tivesse feito. Não um app em cima do React Native.
5. **Obsessed with detail.** Navigation lights piscando no avião. Digit roll-up. Shadow direction responding to tilt. São os detalhes.

---

## 🗺️ Arquitetura das áreas

O app tem **10 áreas funcionais** — cada uma merece sua **linguagem visual distinta** dentro do mesmo design system.

```
┌──────────────────────────────────────────────────────────┐
│ 1. AUTH & ONBOARDING            Status: ✅ FLAGSHIP DONE │
│    login, register, onboarding, welcome-quiz             │
│    Signature: FlyingPlaneScene, confetti reveal          │
├──────────────────────────────────────────────────────────┤
│ 2. NAVIGATION                   Status: ✅ FLAGSHIP DONE │
│    tabs/_layout, tabs/index (home)                       │
│    Signature: FloatingTabBar, LiveActivityBanner,        │
│               TiltCard3D wallet hero                     │
├──────────────────────────────────────────────────────────┤
│ 3. FINANCE (arbitragem)         Status: ✅ MOSTLY DONE   │
│    wallet, calculator, arbitrage, bonus-history,         │
│    dashboard, transfer-calculator                         │
│    Signature: AnimatedNumber, verdict ink-fill,          │
│               3D wallet cards, pulse gain%               │
├──────────────────────────────────────────────────────────┤
│ 4. COMMUNICATION                Status: ✅ MOSTLY DONE   │
│    alerts, alerts/create, notifications-feed,            │
│    notification-settings                                  │
│    Signature: Empty radar ping, icon-per-type cards      │
├──────────────────────────────────────────────────────────┤
│ 5. GAMIFICATION                 Status: 🟡 PARTIAL (2/7) │
│    goals ✅, leaderboard ✅, missions ❌, retrospective ❌,│
│    referral ❌, report-bonus ❌, subscription ✅          │
│    Signature gap: Wrapped story, mission completion      │
│                  celebration, referral shareable card    │
├──────────────────────────────────────────────────────────┤
│ 6. CONTENT & LEARNING           Status: ❌ ZERO          │
│    articles/*, guides/*                                   │
│    Signature needed: Apple News-style reader, typography │
│                      hierarchy, image hero parallax      │
├──────────────────────────────────────────────────────────┤
│ 7. TOOLS (financial utilities)  Status: ❌ ZERO          │
│    card-recommender, card-compare, claims-wizard,        │
│    compensation-eu261, tax-report, portfolio-analysis    │
│    Signature needed: Tinder swipe for cards,             │
│                     split-screen compare, chart flows    │
├──────────────────────────────────────────────────────────┤
│ 8. SOCIAL                       Status: ❌ ZERO          │
│    forum/*, family                                        │
│    Signature needed: iMessage-style threads, family      │
│                     stack avatars overlapping            │
├──────────────────────────────────────────────────────────┤
│ 9. TRAVEL & TRIPS               Status: ❌ ZERO          │
│    (tabs)/simulator, explore, transfers, trips           │
│    Signature needed: Route arc SVG animation,            │
│                     paper-fold flight card reveal        │
├──────────────────────────────────────────────────────────┤
│ 10. SETTINGS & ACCOUNT          Status: ❌ ZERO          │
│    edit-profile, security, active-sessions,              │
│    preferences, settings/*, support/*                     │
│    Signature needed: iOS Settings-style grouped rows,    │
│                     inline toggles com haptic            │
└──────────────────────────────────────────────────────────┘
```

---

## 🎨 Signature moments por área

Cada área tem **UM momento que o usuário lembra e conta pro amigo**. Não são "features" — são *experiências*.

### AUTH ✅
**Signature:** FlyingPlaneScene no login — avião voando pelas nuvens em parallax.
**Por quê é memorável:** primeira tela. Imediatamente o user pensa "esse app é diferente".

### NAVIGATION ✅
**Signature:** LiveActivityBanner pulsando quando tem bônus hot + TiltCard3D do wallet value.
**Por quê:** o user abre o app e IMEDIATAMENTE sente urgência (banner) + interatividade (cartão que inclina).

### FINANCE ✅
**Signature:** Verdict banner com **ink-fill wipe** na calculadora (TRANSFERIR vs ESPERAR).
**Por quê:** é o *momento da decisão*. Quando a decisão é visualmente CATEGÓRICA (tinta cobrindo o banner da cor da recomendação), user confia.

### GAMIFICATION 🟡 [3 moments needed]
- **Missions:** ao completar missão → **confetti burst + ring filling 100% com glow pulse + haptic success**
- **Retrospective (Wrapped):** tela cheia full-screen story stack estilo **Spotify Wrapped/Apple Fitness Year in Review** — swipe vertical entre insights
- **Referral:** ao gerar link → **card shareable animado** estilo **Apple Invite / Apple Gift Card** com preview

### CONTENT & LEARNING ❌
- **Article reader:** **Apple News-style hero image parallax no top** + typography **Charter/New York Serif vibe** pra body + pull-quote destacado + continue reading indicator
- **Guides feed:** card stacked **com peek** do próximo

### TOOLS ❌
- **Card recommender:** **Tinder-style swipe cards**, cada cartão um credit card, swipe right = "quero esse", swipe left = skip. Ao fim, **stack de favoritos** com comparação
- **Card compare:** **split-screen side-by-side** com barras horizontais tipo Apple iPhone Compare (iPhone 15 vs 15 Pro)
- **Portfolio analysis:** **charts estilo Apple Investing/Health** — sparklines, trend arrows, percentage change badges

### SOCIAL ❌
- **Forum thread:** **iMessage-style bubbles** — OP tem bubble diferente + replies aninhadas
- **Family:** **overlapping avatar stack** (tipo Apple Family Sharing) + activity ring por membro

### TRAVEL ❌
- **Simulator:** ao buscar voo → desenha **arco SVG animado do origem → destino** no mapa + flight cards com **paper-fold unfurl reveal**

### SETTINGS ❌
- **iOS-style grouped rows**: section headers all-caps 11pt, rows com icon+label+chevron, inline toggles, glass backdrop
- **Signature:** micro-haptic em CADA toggle

---

## 📐 Novos primitives necessários

Para executar as waves, preciso de **5 componentes novos** além dos 19 já prontos:

| # | Primitive | Wave | Para qual tela |
|---|---|---|---|
| 1 | **SegmentedControl** | 1 | alerts, filters em geral — iOS 17 capsule |
| 2 | **SwipeableStack** | 3 | card-recommender (Tinder-style) |
| 3 | **RouteArc** | 6 | simulator (SVG arc com animação path draw) |
| 4 | **WrappedStoryStack** | 1 | retrospective (full-screen vertical stories) |
| 5 | **InlineSettingsRow** | 4 | settings/* (ios grouped list row) |

---

## 🚀 Execution plan — 6 waves

Priorizado por **impacto emocional × esforço**.

### Wave 1 — Gamification completion (HIGH emotional, MEDIUM effort)
**Rationale:** essas são as telas de *reward* — fecham o loop de engajamento. Mais ROI de detail.

- [ ] `missions.tsx` — grid de missões com progress rings + completion burst
- [ ] `retrospective.tsx` — full-screen Wrapped-style story stack (signature big)
- [ ] `referral.tsx` — shareable card animado
- [ ] `report-bonus.tsx` — form delicious (success state animado)

**Componentes novos:** WrappedStoryStack, SegmentedControl

### Wave 2 — Content (MEDIUM emotional, MEDIUM effort)
**Rationale:** educação retém user. Quality reader = user volta.

- [ ] `articles/index.tsx` — feed Apple News style
- [ ] `articles/[slug].tsx` — reader com hero parallax
- [ ] `guides/index.tsx` — feed
- [ ] `guides/[slug].tsx` — reader
- [ ] `guides/new.tsx` — editor

### Wave 3 — Tools power users (MEDIUM emotional, HIGH effort)
**Rationale:** diferenciação competitiva. Apps de milhas não têm isso.

- [ ] `card-recommender.tsx` — swipe stack Tinder-style (signature big)
- [ ] `card-compare.tsx` — split-screen compare
- [ ] `portfolio-analysis.tsx` — charts Apple Health-style
- [ ] `claims-wizard.tsx` — multi-step wizard com progress
- [ ] `compensation-eu261.tsx` — multi-step
- [ ] `tax-report.tsx` — document-style download

**Componentes novos:** SwipeableStack, ComparisonBars

### Wave 4 — Settings (LOW emotional, LOW effort — quick wins)
**Rationale:** polish total. User abre settings e vê continuidade Apple.

- [ ] `edit-profile.tsx`
- [ ] `security.tsx`
- [ ] `active-sessions.tsx`
- [ ] `preferences.tsx`
- [ ] `settings/index.tsx`
- [ ] `settings/theme.tsx`
- [ ] `settings/accessibility.tsx`
- [ ] `notification-settings.tsx`
- [ ] `alerts/create.tsx`

**Componentes novos:** InlineSettingsRow

### Wave 5 — Social (MEDIUM emotional, MEDIUM effort)

- [ ] `forum/index.tsx`
- [ ] `forum/[id].tsx` — thread
- [ ] `family.tsx`
- [ ] `support/index.tsx`
- [ ] `support/[id].tsx`

### Wave 6 — Travel & remaining (MEDIUM emotional, HIGH effort)

- [ ] `(tabs)/simulator.tsx` — biggest effort, signature arc animation
- [ ] `explore.tsx`
- [ ] `transfers.tsx`
- [ ] `value-compare.tsx`
- [ ] `price-capture.tsx`
- [ ] `price-history/[programId].tsx`
- [ ] `offer/[id].tsx`
- [ ] `admin-review/[id].tsx`

**Componentes novos:** RouteArc

---

## 🎁 Bonus moments (interações cross-cutting)

Pequenos toques que vão em **todas as telas** (não em screens específicas):

1. **Screen transitions customizadas** via expo-router — fade + slide sutil (não default push)
2. **Pull-to-refresh stretchy** com ícone emergindo (não spinner iOS padrão)
3. **Swipe-to-dismiss** em modais/sheets (com threshold + haptic)
4. **Keyboard-aware inputs** com auto-scroll elegante
5. **Loading states SHIM-based** em vez de spinners (ShimmerSkeleton já temos)
6. **Error states ILLUSTRATED** em vez de texto (EmptyStateIllustrated já cobre)
7. **Success states com AnimatedCheckmark** (precisa criar) — draw line SVG on complete

---

## 📊 Estado acumulado + target

```
Atual:
  ✅ 21 screens migradas (flagship + hero + core CRUD)
  ✅ 20 primitives (11 basic + 7 Jobs-level + FlyingPlaneScene + hooks)

Target (após 6 waves):
  ✅ 60 screens migradas (100%)
  ✅ 25 primitives (5 novos)
  ✅ Documentação completa (README + Migration guide + Roadmap)
```

---

## 🎬 The Jobs test

Após cada wave, pergunta: "Se um engenheiro da Apple abrisse essa tela, ele apontaria um detalhe que falta?"

Se sim → não está pronta.

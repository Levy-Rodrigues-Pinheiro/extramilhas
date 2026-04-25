# Milhas Extras — Project guide for Claude

## Stack
- **Mobile:** React Native 0.74 + Expo 51 + expo-router 3.5 + NativeWind 4 +
  reanimated 3.10 + react-native-svg 15
- **Backend:** NestJS + Prisma + PostgreSQL + Redis (queue: BullMQ)
- **Scraper:** Playwright (port 3002)
- **Web:** Next.js 14 (landing + admin)

## Design system (canônico)

Toda decisão visual passa por uma destas duas referências, nessa ordem:

1. **`apple-style-app-design` skill** — instalada em `~/.claude/skills/apple-style-app-design/`
   - Hub: `SKILL.md` (princípios, decisões rápidas, checklist)
   - 27 references por tópico (`references/01-27-*.md`)
   - 7 assets de código (`assets/*`)
   - **Pointer no projeto:** [`mobile/src/design/SKILL_REFERENCE.md`](mobile/src/design/SKILL_REFERENCE.md)

2. **Aurora UI design system** — camada de identidade de marca sobre o Apple HIG
   - Tokens: [`mobile/src/design/tokens.ts`](mobile/src/design/tokens.ts)
   - Primitives: [`mobile/src/components/primitives/index.ts`](mobile/src/components/primitives/index.ts)
   - Aurora flavor: pure black bg, mesh-bg + noise, gradient cyan→iris→magenta,
     serif italic accent (Georgia), pill buttons radius 100, glass surfaces

**Política de prioridade:**
- **Aurora UI** vence em telas de marca/hero (login, onboarding, home, hero cards)
- **Apple HIG** vence em telas funcionais (settings, lists, data dense, forms)
- Sempre passe por checklist Apple-style antes de PR

## Workflow para mudar UI

1. Antes de codar: ler `references/<tema>.md` da skill (ex: `16-forms-and-auth.md`)
2. Codar usando primitives existentes (`mobile/src/components/primitives/`)
3. Se faltar primitive, ver `~/.claude/skills/apple-style-app-design/assets/ios-components.tsx`
   ou `form-components.tsx` pra inspiração + portar pra RN
4. Cruzar com `references/09-anti-patterns.md` antes de PR
5. `cd mobile && npx tsc --noEmit` antes de commit

## Comandos comuns

```bash
# Mobile (na pasta mobile/)
npx tsc --noEmit            # type check
npx expo start              # dev server
npm run lint                # eslint

# Backend
cd backend && npm run start:dev
npx prisma migrate dev
npx prisma studio

# Tests
npm test
npm run test:e2e
```

## Convenções

- **Commits:** Conventional Commits (`feat(mobile):`, `fix(backend):`, `chore:`)
- **Branches:** `feature/<short>`, `fix/<short>`, `chore/<short>`
- **TypeScript strict:** zero `any` desnecessário; todos os erros do compiler resolvidos
- **No comments unless requested:** código autoexplicativo + JSDoc só em primitives/APIs
- **Haptics:** sempre em interações tap (`haptics.tap`), select (`haptics.select`),
  success/error nos resultados
- **Reduce motion:** sempre respeitar `useReduceMotion()` em animações infinitas/longas

## Áreas funcionais

10 áreas mapeadas no [`mobile/src/design/DESIGN_ROADMAP.md`](mobile/src/design/DESIGN_ROADMAP.md):
1. Auth & Onboarding ✅
2. Navigation ✅
3. Finance (arbitragem) ✅
4. Communication ✅
5. Gamification ✅
6. Content (articles/guides) ✅
7. Tools (recommender) ✅
8. Settings ✅
9. Social ✅
10. Misc (explore, transfers, notes) ✅

Próximo foco: aplicar a skill **apple-style-app-design** em screens funcionais
que ainda não passaram pelo Apple HIG checklist.

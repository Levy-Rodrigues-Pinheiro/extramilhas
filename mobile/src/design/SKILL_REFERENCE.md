# Apple-Style App Design — Skill canônica do projeto

Este projeto usa a skill **`apple-style-app-design`** como **fonte canônica de
verdade** para toda decisão visual. Antes de criar/refatorar qualquer tela,
consulte esta referência.

## Onde a skill mora

- **Instalação local:** `~/.claude/skills/apple-style-app-design/`
- **Origem (snapshot):** `OneDrive/Área de Trabalho/Design/files (1)/apple-style-app-design/`
- **Estrutura:**
  - `SKILL.md` (hub navegável — princípios, decisões rápidas, checklist)
  - `references/01-27 *.md` (27 docs profundos por tópico)
  - `assets/` (7 arquivos: tokens.css, easings.ts, utilities.tsx, ios-components.tsx,
    form-components.tsx, icon-mappings.md, tailwind-apple-config.js)

## Como invocar

A skill é registrada no harness — você pode invocá-la via Skill tool ou ela é
ativada automaticamente em pedidos de design (palavras-chave: "estilo Apple",
"premium", "minimalista", "polished", "iOS-like").

## Mapeamento — assets web → primitives RN do projeto

A skill é orientada pra **web (React + Framer Motion)**. Nossa adaptação para
React Native + Reanimated 3 já cobre a maior parte. Tabela de equivalência:

| Skill asset / componente | Equivalente RN no projeto | Status |
|---|---|---|
| `design-tokens.css` (light + dark) | `mobile/src/design/tokens.ts` (dark-only por ora) | ✅ alinhado dark mode |
| `easings.ts` ease.apple | `tokens.ts > easingParams.out` `[0.16, 1, 0.3, 1]` | ✅ |
| `easings.ts` ease.spring | `easingParams.spring` `[0.34, 1.56, 0.64, 1]` | ✅ |
| `easings.ts` ease.softIn | `easingParams.smooth` `[0.4, 0, 0.2, 1]` | ✅ |
| `apple-utilities.tsx` Magnetic | (web-only — não tem em mobile) | N/A |
| `apple-utilities.tsx` TiltCard | `primitives/TiltCard3D` | ✅ |
| `apple-utilities.tsx` Reveal | `primitives/StaggerItem` (variantes) | ✅ |
| `apple-utilities.tsx` Glass | `primitives/GlassCard` | ✅ |
| `apple-utilities.tsx` ThemeToggle | (app é dark-only por ora) | ⏳ |
| `apple-utilities.tsx` CustomCursor | (web-only) | N/A |
| `ios-components.tsx` TabBar | `primitives/FloatingTabBar` | ✅ |
| `ios-components.tsx` LargeTitle | `primitives/ScrollDrivenHeader` | ✅ |
| `ios-components.tsx` Sheet | (usar `@gorhom/bottom-sheet`) | ⏳ pendente |
| `ios-components.tsx` ActionSheet | (Alert.alert nativo) | ⚠️ podemos melhorar |
| `ios-components.tsx` SwipeListItem | (não criado) | ⏳ pendente |
| `ios-components.tsx` PullToRefresh | RefreshControl nativo | ✅ |
| `ios-components.tsx` Subpage | (header padrão das telas) | ✅ |
| `ios-components.tsx` haptic | `design/haptics.ts` | ✅ |
| `form-components.tsx` FormField | `primitives/AuroraInput` + `FloatingLabelInput` | ✅ |
| `form-components.tsx` OtpInput | `primitives/OTPInput` | ✅ |
| `form-components.tsx` PasswordStrength | (não criado) | ⏳ pendente |
| `form-components.tsx` MultiStepForm | (state machine inline em login) | ✅ inline |
| `form-components.tsx` Toggle | RN Switch (estilo padrão) | ⚠️ podemos polir |
| `form-components.tsx` Slider | `@react-native-community/slider` | ⚠️ |

## Deltas a corrigir nos tokens (alignment audit)

Comparei `tokens.ts` (v4) vs `design-tokens.css` (skill) — quase tudo bate, exceto:

### Cores text (dark)

| Token | tokens.ts atual | skill spec | Decisão |
|---|---|---|---|
| `text.secondary` | `#a1a1a6` | `#98989D` (mais escuro) | ✅ ajustar pra `#98989D` (mais Apple) |
| `text.tertiary` | `#6e6e73` | `#6D6D70` (~mesmo) | ✅ manter |
| `text.quaternary` | `rgba(245,245,247,0.22)` | `#48484A` (text-subtle) | ✅ adicionar token `text.subtle` |

### Borders (dark)

| Token | tokens.ts atual | skill spec |
|---|---|---|
| `surface.glassBorder` | `rgba(255,255,255,0.08)` | `#38383A` ou `rgba(255,255,255,0.08)` (glass) | ambos ok dependendo do contexto |
| `surface.glassBorderActive` | `rgba(255,255,255,0.16)` | `#636366` (border-strong sólido) | manter translúcido p/ glass |

### Glass background (dark)

| Token | tokens.ts atual | skill spec |
|---|---|---|
| `surface.glass` | `rgba(255,255,255,0.05)` | `rgba(28,28,30,0.72)` (Apple HIG glass) |

A spec da skill usa **glass com tinta escura translúcida** (`rgba(28,28,30,0.72)`)
enquanto a nossa usa **branco translúcido sutil** (`rgba(255,255,255,0.05)`).

A diferença filosófica:
- **Apple HIG:** glass = camada acima do conteúdo, com **tinta escura** (over dark mode) que pode ser vista pelo bg
- **Aurora UI (que adotamos):** glass = surface translúcida branca leve, sobre bg pure black

Recomendação: **manter Aurora UI nos cards comuns** (visual mais light/clean) e
**adotar Apple-glass no nav/sheet** (que precisa de tinta escura pra contrastar
com mesh-bg colorido por trás).

### Sombras (dark) — multi-layer

A skill usa sempre 2-3 camadas. Nosso `shadow.md` tem 1, `shadow.lg` tem 1.

```ts
// Skill spec (dark mode):
--shadow-default:
  0 2px 4px rgba(0,0,0,0.3),
  0 4px 12px rgba(0,0,0,0.4),
  0 8px 24px rgba(0,0,0,0.5);
```

React Native só aceita **uma sombra por componente** (limitação da plataforma).
Workaround: empilhar Views com sombras diferentes (`<View shadow1><View shadow2>`),
ou usar a sombra mais marcante e aceitar 1-camada.

**Decisão pragmática:** manter 1-shadow no RN, mas usar valores que sejam
visualmente equivalentes ao stack de 3 (ex: `shadowOpacity: 0.7` aproxima o
total acumulado das 3 camadas).

## Workflow para próximas atualizações

1. **Antes de mexer em uma tela:**
   - Ler `references/<arquivo-relevante>.md` da skill
   - Conferir checklist de qualidade no `SKILL.md` final
2. **Ao codar:**
   - Usar os primitives existentes (`primitives/index.ts`)
   - Se faltar primitive, ver se já existe na skill (ios-components.tsx ou form-components.tsx)
3. **Após codar:**
   - Cruzar com `references/09-anti-patterns.md`
   - `tsc --noEmit` antes de commit

## Arquivos-chave por tópico

Atalhos pra uso rápido:

- **Hero / título com serif italic:** `references/02-typography.md` + `15-landing-patterns.md`
- **Login / OTP / payment:** `references/16-forms-and-auth.md` + `assets/form-components.tsx`
- **Onboarding:** `references/17-onboarding.md`
- **Empty/loading/error states:** `references/18-empty-loading-error-states.md`
- **Settings:** `references/20-settings-preferences.md`
- **Charts:** `references/21-data-visualization.md`
- **Animação:** `references/06-animation.md` + `assets/easings.ts`
- **Iconografia:** `references/10-iconography.md` + `assets/icon-mappings.md`
- **Acessibilidade:** `references/11-accessibility.md`
- **Anti-patterns:** `references/09-anti-patterns.md`

## Diferenças entre Aurora UI (web) e Apple HIG puro

Já adotamos vários elementos do **Aurora UI** (mesh-bg, gradient-text cyan→iris→magenta, serif italic, pill buttons radius 100). A skill **apple-style-app-design** é mais ortodoxa Apple HIG, sem o "Aurora flavor".

**Política do projeto:**
- **Aurora UI** = identidade visual de marca (login, hero, gradients vibrantes)
- **Apple HIG** = padrão de qualidade base (cards, listas, navegação, settings)
- Onde houver conflito, **Apple HIG vence** em telas funcionais (settings, lists,
  data dense) e **Aurora UI vence** em telas de marca/hero (login, onboarding).

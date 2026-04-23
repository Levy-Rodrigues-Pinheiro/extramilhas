# Milhas Extras Design System — "Aurora + Apple HIG"

**Base:** palette oficial da Apple (iOS 17 / macOS Sonoma Human Interface Guidelines) — systemColors dark mode, label hierarchy com alpha, fill scale (primary/secondary/tertiary/quaternary).

**Motion personality:** _"Jet landing on glass."_ Confident approach, controlled flare, zero rubber. Movimento aéreo, física realista, pouso suave.

**Assinatura Aurora:** cyan→iris→magenta alinhado com `system.teal` + `system.indigo` + `system.purple` da Apple. Usar APENAS em hero/celebration. Para CTAs universais, use `system.blue` (AuroraButton variant="apple").

---

## 📦 O que está aqui

```
mobile/src/design/
  tokens.ts       — cores, typography, spacing, radius, shadows, gradients
  motion.ts       — timing, curves, spring configs, stagger helpers
  haptics.ts      — wrappers sobre expo-haptics (tap/select/success/...)
  hooks.ts        — useReduceMotion

mobile/src/components/primitives/
  AuroraBackground.tsx    — mesh gradient animado (respiração ambiente)
  GlassCard.tsx           — surface glassmorphism + border glow
  PressableScale.tsx      — HOC universal press-feedback + haptic
  AnimatedNumber.tsx      — counter roll-up com Intl (R$ / mi / %)
  ShimmerSkeleton.tsx     — placeholder com shimmer animado
  StaggerList.tsx         — FadeInUp sequencial (delay por index)
  ConfettiBurst.tsx       — celebration radial com física
  EmptyStateIllustrated.tsx — empty state VIVO (radar/avião/compass)
  AuroraButton.tsx        — CTA premium (gradient + glow + loading shimmer)
  FloatingTabBar.tsx      — tab bar custom com indicator spring
  FloatingLabelInput.tsx  — input com label flutuante + border-color morph
  index.ts                — barrel exports
```

---

## 🎨 Paleta (Apple HIG dark mode)

### Backgrounds (sistema iOS)
- `bg.base`       `#050810`  — quase preto com navy sutil (aurora respira)
- `bg.layer1`     `#1C1C1E`  — secondarySystemBackground (cards/sheets)
- `bg.layer2`     `#2C2C2E`  — tertiary (nested cards)
- `bg.layer3`     `#3A3A3C`  — quaternary (elevated)

### System colors (Apple iOS 17)
- `system.blue`    `#0A84FF` — **CTAs universais** (use `AuroraButton variant="apple"`)
- `system.green`   `#30D158` — success
- `system.red`     `#FF453A` — destructive
- `system.orange`  `#FF9F0A` — warning
- `system.yellow`  `#FFD60A` — info/highlight
- `system.purple`  `#BF5AF2` — accent
- `system.indigo`  `#5E5CE6` — bridge
- `system.teal`    `#64D2FF` — info/brand
- `system.pink`    `#FF375F`

### Labels (alpha hierarchy — Apple standard)
- `text.primary`     `#FFFFFF` (100%)
- `text.secondary`   `rgba(235,235,245,0.60)` (60%)
- `text.tertiary`    `rgba(235,235,245,0.30)` (30%)
- `text.quaternary`  `rgba(235,235,245,0.18)` (18%)

### Fills (iOS material scale)
- `fill.primary`     20% alpha (grouped backgrounds)
- `fill.secondary`   16% alpha (card hover)
- `fill.tertiary`    12% alpha (inactive)
- `fill.quaternary`  8%  alpha (subtle dividers)

### Aurora (nossa brand accent)
- `aurora.cyan`    `#64D2FF` = `system.teal`
- `aurora.iris`    `#5E5CE6` = `system.indigo`
- `aurora.magenta` `#BF5AF2` = `system.purple`
- Uso: **apenas** em hero/celebration/brand moments

### Premium (gold)
- `premium.gold`       `#FFD60A` = `system.yellow`
- `premium.goldLight`  `#FFE066`
- Uso: PRO badge, streak rewards, top-3 leaderboard

### Separators
- `surface.separator`   `rgba(84,84,88,0.35)` (Apple nonOpaqueSeparator)
- `surface.glassBorder` `rgba(84,84,88,0.65)` (Apple opaqueSeparator)

## ⏱ Timing

| Token | ms | Uso |
|---|---|---|
| `motion.timing.instant` | 80 | press feedback |
| `motion.timing.short` | 160 | tabs, toggles, chips |
| `motion.timing.base` | 240 | cards, modals |
| `motion.timing.medium` | 360 | screens, hero reveal |
| `motion.timing.long` | 520 | celebrations |
| `motion.timing.ambient` | 1800 | shimmers, parallax loops |

## 🎾 Springs

| Token | damping/stiffness | Uso |
|---|---|---|
| `springConfig.snappy` | 22/340 | press, toggles |
| `springConfig.settled` | 28/180 | sheets, modals |
| `springConfig.bouncy` | 14/260 | **apenas** rewards |
| `springConfig.indicator` | 20/280 | tab indicators |

---

## 🚀 Como usar (quickstart)

### Screen wrapper

```tsx
import { AuroraBackground } from '@/components/primitives';

<AuroraBackground intensity="subtle" style={{ flex: 1 }}>
  <SafeAreaView style={{ flex: 1 }}>
    <ScrollView>
      {/* seu conteúdo */}
    </ScrollView>
  </SafeAreaView>
</AuroraBackground>
```

### Card interativo

```tsx
import { PressableScale, GlassCard } from '@/components/primitives';

<PressableScale onPress={handlePress} haptic="tap">
  <GlassCard glow="cyan" radiusSize="lg" padding={16}>
    <Text>Conteúdo</Text>
  </GlassCard>
</PressableScale>
```

### Lista com stagger entrance

```tsx
import { StaggerItem } from '@/components/primitives';

{items.map((item, i) => (
  <StaggerItem key={item.id} index={i}>
    <Card item={item} />
  </StaggerItem>
))}
```

### Número animado

```tsx
import { AnimatedNumber } from '@/components/primitives';

<AnimatedNumber
  value={walletValue}
  format="currency"
  style={styles.heroValue}
  hapticOnChange
/>
```

### Celebração (confetti + haptic)

```tsx
import { ConfettiBurst, type ConfettiBurstHandle } from '@/components/primitives';

const confetti = useRef<ConfettiBurstHandle>(null);

<ConfettiBurst ref={confetti} />

// Ao hit:
confetti.current?.burst();
```

### CTA premium

```tsx
import { AuroraButton } from '@/components/primitives';

<AuroraButton
  label="Entrar"
  icon="arrow-forward"
  iconPosition="right"
  variant="primary"
  size="lg"
  loading={isLoading}
  onPress={handleLogin}
  fullWidth
  haptic="medium"
/>
```

### Empty state não-chato

```tsx
import { EmptyStateIllustrated } from '@/components/primitives';

<EmptyStateIllustrated
  variant="radar"
  title="Sem alertas"
  description="Criamos o primeiro pra você testar."
  ctaLabel="Criar alerta"
  onCtaPress={() => router.push('/alerts/create')}
/>
```

---

## 🔄 Migration guide — screens ainda não redesenhadas

Screens já redesenhadas: **home (tabs/index)**, **login**, **tab bar**.

Para migrar uma screen existente:

1. **Background**: trocar `<SafeAreaView style={{ backgroundColor: Colors.bg.primary }}>` por:
   ```tsx
   <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
     <SafeAreaView style={{ flex: 1 }}>
   ```

2. **TouchableOpacity** → **PressableScale**:
   ```tsx
   // antes
   <TouchableOpacity onPress={handleX} activeOpacity={0.85}>
   // depois
   <PressableScale onPress={handleX} haptic="tap">
   ```

3. **Cards inline** (`bg: #141C2F, borderColor: #253349`) → **GlassCard**:
   ```tsx
   <GlassCard radiusSize="lg" padding={16} glow="none">
     {children}
   </GlassCard>
   ```

4. **ActivityIndicator** em loading → **ShimmerSkeleton** shape-matched:
   ```tsx
   {isLoading ? <SkeletonCard /> : <ActualCard data={data} />}
   ```

5. **Lista estática** → **stagger com StaggerItem**:
   ```tsx
   {items.map((it, i) => (
     <StaggerItem key={it.id} index={i}>
       <Row item={it} />
     </StaggerItem>
   ))}
   ```

6. **Values que mudam** → **AnimatedNumber**:
   ```tsx
   <AnimatedNumber value={totalBrl} format="currency" />
   ```

7. **EmptyState antigo** → **EmptyStateIllustrated** (variant conforme contexto).

8. **Buttons chave** → **AuroraButton**:
   ```tsx
   <AuroraButton label="Salvar" variant="primary" onPress={save} fullWidth />
   ```

---

## ♿ Reduce motion

Todos primitives respeitam `AccessibilityInfo.isReduceMotionEnabled()`:

- translates viram opacity
- shimmer vira static color
- parallax factor = 0
- confetti retorna null
- stagger delay = 0
- springs viram timing curto

Via `useReduceMotion()` hook de `@/design/hooks`.

---

## 🎯 Screens migrated

**Flagship + hero** (9 screens redesenhadas):
1. ✅ `(tabs)/index.tsx` — home hero aurora + streak pulse + stagger
2. ✅ `(tabs)/_layout.tsx` — FloatingTabBar custom (indicator spring)
3. ✅ `(auth)/login.tsx` — aurora + contrail SVG + floating inputs
4. ✅ `(auth)/register.tsx` — espelho do login + referral
5. ✅ `(auth)/onboarding.tsx` — parallax + worm indicator + highlight tags
6. ✅ `wallet.tsx` — AnimatedNumber + aurora bottom sheet + stagger
7. ✅ `transfer-calculator.tsx` — verdict banner ink-fill + stagger
8. ✅ `leaderboard.tsx` — holographic tier card + you-are-here ring
9. ✅ `welcome-quiz.tsx` — confetti reveal + AnimatedNumber no payoff
10. ✅ `arbitrage.tsx` — gain% pulse proporcional + IMPERDÍVEL shimmer

**Remaining** (use migration guide):
- `alerts.tsx` (tab) — empty state + stagger (M effort)
- `simulator.tsx` (tab) — paper-fold + arc SVG (G effort)
- Outras screens "deep" (admin, edit-profile, etc) — quick wins

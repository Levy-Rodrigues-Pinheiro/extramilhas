# Milhas Extras Design System — "Aurora"

**Motion personality:** _"Jet landing on glass."_ Confident approach, controlled flare, zero rubber. Movimento aéreo, física realista, pouso suave.

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

## 🎨 Paleta

- **Background**: deep-space navy (`#070B18 → #0A1020 → #0E1630 → #121C3D`)
- **Aurora** (assinatura): cyan `#22D3EE` → iris `#818CF8` → magenta `#E879F9`
- **Premium** (gold): `#F59E0B → #FBBF24` (use APENAS em reward/PRO)
- **Semantic**: success `#34D399`, warning `#FBBF24`, danger `#F87171`, info `#60A5FA`
- **Glass**: `rgba(255,255,255,0.04)` com border `rgba(255,255,255,0.08)`

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

## 🎯 Next screens a redesenhar (ordem de prioridade)

Baseado no audit inicial (10 prioritárias):

| # | Screen | Esforço | Wow-factor |
|---|---|---|---|
| 4 | onboarding.tsx | M | parallax + worm indicator + shimmer CTA |
| 5 | wallet.tsx (tabs) | M | animated balance + delta chips |
| 6 | arbitrage.tsx | M | gain% glow proporcional, shimmer IMPERDÍVEL |
| 7 | simulator.tsx (tabs) | G | paper-fold reveal + arc animado origem-destino |
| 8 | leaderboard.tsx | M | holographic card por tier + you-are-here ring |
| 9 | calculator.tsx (tabs) | M | verdict banner com ink-fill wipe |
| 10 | welcome-quiz.tsx | M | confetti + roll-up no reveal final |

Cada migração = 30-60min com os primitives já prontos.

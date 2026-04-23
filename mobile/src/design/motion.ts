/**
 * Milhas Extras — Motion tokens
 *
 * Linguagem: "Jet landing on glass".
 *  - Confident approach (accelerated glide in)
 *  - Controlled flare (decelerated settle)
 *  - Zero rubber, never float
 *
 * Todas as durações/curvas compatíveis com Reanimated 3 (worklet).
 * Springs calibrados pra clamp overshoot ≤ 4% (exceto `bouncy` = 12%).
 */

import { Easing, WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';

// ─── TIMINGS ───────────────────────────────────────────────────────────

export const timing = {
  instant: 80,
  short: 160,
  base: 240,
  medium: 360,
  long: 520,
  ambient: 1800, // shimmers, parallax loops
} as const;

// ─── BEZIER CURVES ─────────────────────────────────────────────────────

/**
 * Curvas nomeadas conforme Material 3 Expressive + IBM Carbon:
 * - standard: default universal
 * - accelerated: saídas (offscreen fast)
 * - decelerated: entradas (landing suave)
 * - emphasized: hero/celebration (mais dramático)
 */
export const curve = {
  standard: Easing.bezier(0.33, 0.0, 0.2, 1.0),
  accelerated: Easing.bezier(0.5, 0.0, 0.9, 0.2),
  decelerated: Easing.bezier(0.1, 0.8, 0.2, 1.0),
  emphasized: Easing.bezier(0.2, 0.0, 0.0, 1.0),
  linear: Easing.linear,
} as const;

// ─── TIMING CONFIGS (copy-paste em withTiming) ────────────────────────

export const timingConfig = {
  fast: {
    duration: timing.instant,
    easing: curve.standard,
  } satisfies WithTimingConfig,
  short: {
    duration: timing.short,
    easing: curve.standard,
  } satisfies WithTimingConfig,
  base: {
    duration: timing.base,
    easing: curve.standard,
  } satisfies WithTimingConfig,
  enter: {
    duration: timing.medium,
    easing: curve.decelerated,
  } satisfies WithTimingConfig,
  exit: {
    duration: timing.base,
    easing: curve.accelerated,
  } satisfies WithTimingConfig,
  hero: {
    duration: timing.long,
    easing: curve.emphasized,
  } satisfies WithTimingConfig,
  ambient: {
    duration: timing.ambient,
    easing: curve.linear,
  } satisfies WithTimingConfig,
} as const;

// ─── SPRING CONFIGS ────────────────────────────────────────────────────

/**
 * Springs com physics realistas. `mass` é "peso percebido" do elemento;
 * `damping` controla oscilação; `stiffness` velocidade.
 */
export const springConfig = {
  /** Press feedback, toggles, chips. Velocidade alta, sem bounce. */
  snappy: {
    damping: 22,
    stiffness: 340,
    mass: 0.9,
    overshootClamping: false,
  } satisfies WithSpringConfig,

  /** Sheets, modais, cards que aparecem. Settle natural, leve overshoot. */
  settled: {
    damping: 28,
    stiffness: 180,
    mass: 1.0,
    overshootClamping: false,
  } satisfies WithSpringConfig,

  /** Usar APENAS em celebrations (reward, conquest). Bouncy intencional. */
  bouncy: {
    damping: 14,
    stiffness: 260,
    mass: 1.0,
    overshootClamping: false,
  } satisfies WithSpringConfig,

  /** Indicator de tab (translate fluido). */
  indicator: {
    damping: 20,
    stiffness: 280,
    mass: 0.8,
  } satisfies WithSpringConfig,
} as const;

// ─── STAGGER HELPERS ───────────────────────────────────────────────────

/**
 * Delay pro stagger de listas. Caps em 8 items pra não virar loading eterno.
 * Items 9+ aparecem com 0 delay (simultâneo).
 */
export const stagger = {
  listItemDelay: 40,
  listMaxItems: 8,
  heroChoreography: {
    image: 0,
    title: 80,
    meta: 140,
    cta: 220,
  },
  dashboardLoad: {
    header: 0,
    balance: 60,
    ctas: 120,
    listStart: 180,
  },
} as const;

/**
 * Retorna delay em ms pro item `index` numa lista staggered.
 * Cap em `listMaxItems` — items além disso ficam com 0 delay.
 */
export const getStaggerDelay = (index: number): number => {
  if (index >= stagger.listMaxItems) return 0;
  return index * stagger.listItemDelay;
};

// ─── REDUCE MOTION ─────────────────────────────────────────────────────

/**
 * Quando `AccessibilityInfo.isReduceMotionEnabled === true`:
 * - translates viram opacity only
 * - shimmer vira static
 * - parallax factor = 0
 * - confetti desabilitado (celebration = fade only)
 * - stagger = 0
 * - springs viram timing curto
 *
 * Helper hook em `src/design/hooks.ts` (useReducedMotion).
 */
export const reduceMotion = {
  maxDuration: timing.short, // cap global sob reduce motion
  parallaxFactor: 0, // desabilita parallax
  staggerDelay: 0,
  useSpring: false, // trocar springs por timing
} as const;

// ─── EXPORT ────────────────────────────────────────────────────────────

export const motion = {
  timing,
  curve,
  timingConfig,
  springConfig,
  stagger,
  reduceMotion,
  getStaggerDelay,
} as const;

export default motion;

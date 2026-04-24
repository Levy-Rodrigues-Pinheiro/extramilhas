/**
 * Milhas Extras — Design tokens v4 "AURORA UI"
 *
 * Adaptação React Native do Aurora UI web (Next.js) — mesma linguagem,
 * mesmos tokens, mesmo feel.
 *
 * Design philosophy:
 *  - Apple HIG exato (pure black bg, system color accents)
 *  - Glass surfaces com borders sutis
 *  - Mesh background floating + noise texture (atmosfera Apple)
 *  - Typography: SF Pro / Inter display + New York / Georgia italic serif
 *  - Large rounded (22/32/48) — mais generoso que v3
 *  - Pill CTAs (radius 100)
 *  - Easing curves Apple: (0.16, 1, 0.3, 1) e (0.25, 0.1, 0.25, 1)
 *
 * Fonte: aurora-ui/styles/globals.css + Apple HIG 2024.
 */

// ─── BACKGROUNDS (dark theme — Aurora UI spec) ─────────────────────────

/**
 * Aurora UI usa:
 *   --bg:      #000000  (pure black)
 *   --bg-elev: #0a0a0a
 *   --bg-soft: #141414
 */
export const bg = {
  base: '#000000', // pure black — signature Aurora UI
  space: '#000000', // alias
  deep: '#000000',
  layer1: '#0a0a0a', // bg-elev
  layer2: '#141414', // bg-soft
  layer3: '#1c1c1e',
  fog: 'rgba(0, 0, 0, 0.6)',
} as const;

// ─── LABELS / TEXT (Aurora UI spec) ────────────────────────────────────

/**
 * Aurora UI:
 *   --text:       #f5f5f7  (Apple almost-white)
 *   --text-dim:   #a1a1a6
 *   --text-muted: #6e6e73
 */
export const text = {
  primary: '#f5f5f7',
  secondary: '#a1a1a6',
  tertiary: '#6e6e73',
  quaternary: 'rgba(245, 245, 247, 0.22)',
  // Aliases legíveis
  muted: '#a1a1a6',
  dim: '#6e6e73',
  // Texto sobre aurora gradient / gold (legibilidade)
  onAurora: '#000000',
  onGold: '#1a0f00',
  // Link / system blue
  link: '#0a84ff',
} as const;

// ─── FILLS (Aurora UI surface scale) ───────────────────────────────────

/**
 * Aurora UI:
 *   --surface:       rgba(255,255,255,0.05)
 *   --surface-strong: rgba(255,255,255,0.10)
 *   --surface-hover:  rgba(255,255,255,0.14)
 */
export const fill = {
  primary: 'rgba(255, 255, 255, 0.10)',
  secondary: 'rgba(255, 255, 255, 0.07)',
  tertiary: 'rgba(255, 255, 255, 0.05)',
  quaternary: 'rgba(255, 255, 255, 0.03)',
} as const;

// ─── SURFACE (glass) ────────────────────────────────────────────────────

export const surface = {
  /** --surface */
  glass: 'rgba(255, 255, 255, 0.05)',
  /** --surface-strong */
  glassHover: 'rgba(255, 255, 255, 0.10)',
  /** --surface-hover */
  glassActive: 'rgba(255, 255, 255, 0.14)',
  /** --border */
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBorderSubtle: 'rgba(255, 255, 255, 0.05)',
  /** --border-strong */
  glassBorderActive: 'rgba(255, 255, 255, 0.16)',
  /** separator sutil */
  separator: 'rgba(255, 255, 255, 0.08)',
  /** nav background (blur fallback) */
  navBg: 'rgba(22, 22, 23, 0.72)',
} as const;

// ─── SYSTEM COLORS (Aurora UI accents = Apple iOS) ─────────────────────

/**
 * Aurora UI accents — mapeados 1:1 com Apple iOS 17 system colors.
 *   --accent:   #0a84ff (system blue)
 *   --accent-2: #bf5af2 (system purple)
 *   --accent-3: #ff375f (system pink)
 *   --accent-4: #30d158 (system green)
 *   --accent-5: #ff9f0a (system orange)
 */
export const system = {
  blue: '#0a84ff',
  purple: '#bf5af2',
  pink: '#ff375f',
  green: '#30d158',
  orange: '#ff9f0a',
  // Estendido (usado em outras partes do app)
  red: '#ff453a',
  yellow: '#ffd60a',
  indigo: '#5e5ce6',
  teal: '#64d2ff',
  cyan: '#64d2ff',
  mint: '#66d4cf',
  brown: '#ac8e68',
  gray: '#8e8e93',
  gray2: '#636366',
  gray3: '#48484a',
  gray4: '#3a3a3c',
  gray5: '#2c2c2e',
  gray6: '#1c1c1e',
} as const;

// ─── SEMANTIC (aliases) ────────────────────────────────────────────────

export const semantic = {
  success: system.green, // #30d158
  successBg: 'rgba(48, 209, 88, 0.14)',
  successGlow: 'rgba(48, 209, 88, 0.40)',
  warning: system.orange, // #ff9f0a
  warningBg: 'rgba(255, 159, 10, 0.14)',
  danger: system.red, // #ff453a
  dangerBg: 'rgba(255, 69, 58, 0.14)',
  info: system.teal,
  infoBg: 'rgba(100, 210, 255, 0.14)',
  primary: system.blue, // #0a84ff
  primaryBg: 'rgba(10, 132, 255, 0.14)',
} as const;

// ─── AURORA BRAND (3-color gradient = Aurora UI gradient-text) ─────────

/**
 * Aurora UI gradient:
 *   linear-gradient(135deg, var(--accent), var(--accent-2), var(--accent-3))
 *   = blue → purple → pink
 *
 * Essa é A assinatura visual.
 */
export const aurora = {
  cyan: '#0a84ff', // = system.blue
  iris: '#bf5af2', // = system.purple
  magenta: '#ff375f', // = system.pink (Aurora UI final gradient stop)
  cyanSoft: 'rgba(10, 132, 255, 0.18)',
  magentaSoft: 'rgba(255, 55, 95, 0.18)',
  cyanGlow: 'rgba(10, 132, 255, 0.50)', // = --glow
  magentaGlow: 'rgba(255, 55, 95, 0.42)',
} as const;

// ─── PREMIUM (gold) ────────────────────────────────────────────────────

export const premium = {
  gold: system.orange, // #ff9f0a
  goldLight: '#ffb84d',
  goldDark: '#cc7f00',
  goldSoft: 'rgba(255, 159, 10, 0.14)',
  goldGlow: 'rgba(255, 184, 77, 0.36)',
} as const;

// ─── PROGRAM COLORS ────────────────────────────────────────────────────

export const program = {
  smiles: '#FF6B00',
  latampass: '#E2262C',
  tudoazul: '#00A9E0',
  livelo: '#FFB600',
  esfera: '#CB0A2F',
  multiplus: '#1A5CA8',
} as const;

// ─── SPACING ────────────────────────────────────────────────────────────

export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  hero: 64,
} as const;

// ─── RADIUS (Aurora UI spec: generoso, Apple-like) ─────────────────────

/**
 * Aurora UI:
 *   --radius-sm: 12px
 *   --radius:    22px  (base)
 *   --radius-lg: 32px
 *   --radius-xl: 48px
 *
 * Mais generoso que v3 (10/14/18/24). Dá aquele feel Apple.
 * Pill CTAs: 100.
 */
export const radius = {
  none: 0,
  xs: 8,
  sm: 12, // Aurora UI --radius-sm
  md: 18,
  lg: 22, // Aurora UI --radius
  xl: 32, // Aurora UI --radius-lg
  xxl: 48, // Aurora UI --radius-xl
  pill: 100, // Aurora UI pill buttons
} as const;

// ─── TYPOGRAPHY ────────────────────────────────────────────────────────

/**
 * Aurora UI:
 *   --font-display: SF Pro Display / Inter (primary)
 *   --font-serif:   New York / Georgia (italic accent - "futuro")
 *   --font-mono:    SF Mono
 *
 * No mobile, Inter já está carregado. Para serif italic accent, usamos
 * Georgia (disponível em iOS + Android nativamente).
 */
export const fontFamily = {
  display: 'Inter_700Bold', // SF Pro substitute
  displayBlack: 'Inter_900Black',
  displayRegular: 'Inter_400Regular',
  displaySemiBold: 'Inter_600SemiBold',
  displayMedium: 'Inter_500Medium',
  serifItalic: 'Georgia-Italic', // fallback nativo
  mono: 'Menlo',
} as const;

export const type = {
  // Hero display (hero numbers, wallet value)
  largeTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: -0.41,
  },
  // H1 — screen titles
  title1: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.36,
  },
  title2: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.28,
  },
  title3: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.2,
  },
  headline: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 17,
    lineHeight: 22,
  },
  bodyBold: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
  },
  callout: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 21,
  },
  subheadline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 20,
  },
  footnote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  caption1: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  caption2: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0.06,
  },
  // Display huge (Aurora UI hero — clamp(3rem, 9vw, 7rem))
  display: {
    fontFamily: 'Inter_700Bold',
    fontSize: 56,
    lineHeight: 58,
    letterSpacing: -2.3,
  },
  // Serif italic accent (Aurora UI "serif-italic" class)
  serifItalic: {
    fontFamily: Platform_isIOS() ? 'Georgia-Italic' : 'serif',
    fontStyle: 'italic' as const,
    fontWeight: '400' as const,
  },
  // Legacy aliases (compat com screens já migradas)
  h1: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.36,
  },
  h2: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.28,
  },
  h3: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
  },
  cta: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
  },
  micro: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0.06,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
} as const;

function Platform_isIOS() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native').Platform.OS === 'ios';
  } catch {
    return false;
  }
}

// ─── SHADOWS (Aurora UI --shadow-lg spec) ──────────────────────────────

/**
 * Aurora UI:
 *   --shadow-lg: 0 30px 60px -20px rgba(0, 0, 0, 0.7)
 *   --glow:      rgba(10, 132, 255, 0.5) — accent blue glow
 */
export const shadow = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.7,
    shadowRadius: 40,
    elevation: 18,
  },
  // Glows (Aurora UI --glow accent)
  glowBlue: {
    shadowColor: '#0a84ff',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 12,
  },
  glowCyan: {
    shadowColor: aurora.cyan,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 12,
  },
  glowMagenta: {
    shadowColor: aurora.magenta,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 12,
  },
  glowGold: {
    shadowColor: premium.goldLight,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 14,
  },
} as const;

// ─── GRADIENTS (Aurora UI signature) ───────────────────────────────────

/**
 * Signature: linear-gradient(135deg, --accent, --accent-2, --accent-3)
 *         = #0a84ff → #bf5af2 → #ff375f
 */
export const gradients = {
  /** Aurora signature — 3 stops (blue → purple → pink) */
  aurora: [aurora.cyan, aurora.iris, aurora.magenta] as [string, string, string],
  /** Aurora 2-stop (text/button) */
  auroraCyanMagenta: [aurora.cyan, aurora.magenta] as [string, string],
  /** Primary Apple button gradient (Aurora UI --accent → --accent-2) */
  primaryApple: [system.blue, system.purple] as [string, string],
  /** Hero bg (pure black depth) */
  heroBg: ['#000000', '#0a0a0a', '#000000'] as [string, string, string],
  /** Muted aurora pra bg ambient */
  hero: ['#0a0a0a', '#14051a', '#0a0a0a'] as [string, string, string],
  /** Premium gold */
  premium: [premium.goldDark, premium.gold, premium.goldLight] as [string, string, string],
  /** Success green */
  success: ['#0f8a3c', system.green, '#66e88a'] as [string, string, string],
  /** Danger red */
  danger: ['#a30014', system.red, '#ff7a73'] as [string, string, string],
  /** Glass sheen */
  glassSheenTop: [
    'rgba(255,255,255,0.14)',
    'rgba(255,255,255,0.00)',
  ] as [string, string],
  glassVertical: [
    'rgba(255,255,255,0.06)',
    'rgba(255,255,255,0.02)',
  ] as [string, string],
} as const;

// ─── OPACITY / Z-INDEX ──────────────────────────────────────────────────

export const opacity = {
  disabled: 0.4,
  pressed: 0.7,
  hover: 0.85,
  full: 1.0,
} as const;

export const zIndex = {
  base: 0,
  float: 10,
  sticky: 20,
  dropdown: 30,
  sheet: 40,
  modal: 50,
  toast: 60,
  tooltip: 70,
} as const;

// ─── AURORA UI EASING (compat com motion.ts) ────────────────────────────

/**
 * Aurora UI:
 *   --ease-out:    cubic-bezier(0.16, 1, 0.3, 1)
 *   --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1)
 *   --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)
 *   --ease-apple:  cubic-bezier(0.25, 0.1, 0.25, 1)
 */
export const easingParams = {
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  smooth: [0.4, 0, 0.2, 1] as [number, number, number, number],
  spring: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  apple: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
} as const;

// ─── EXPORT ────────────────────────────────────────────────────────────

export const tokens = {
  bg,
  text,
  fill,
  surface,
  system,
  semantic,
  aurora,
  premium,
  program,
  space,
  radius,
  type,
  fontFamily,
  shadow,
  gradients,
  opacity,
  zIndex,
  easingParams,
} as const;

export type Tokens = typeof tokens;
export default tokens;

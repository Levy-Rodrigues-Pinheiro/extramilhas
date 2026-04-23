/**
 * Milhas Extras — Design tokens v3 ("Aurora + Apple HIG").
 *
 * Base: palette oficial da Apple (iOS 17 / macOS Sonoma Human Interface Guidelines)
 * — adotamos os systemColors dark mode, label hierarchy com alpha, e fill scale
 * (primary/secondary/tertiary/quaternary) que dão aquele feeling iOS nativo.
 *
 * Nossa assinatura (Aurora): cyan→iris→magenta permanece — mas refinada
 * (menos saturada que v2), usada APENAS como accent em hero/celebration.
 * Apple HIG chama de "restraint" — não seja chamativo por default.
 *
 * Material/Glass: fills Apple são alpha sobre bg preto, não branco.
 *
 * Principles:
 *  - Clarity (typography > chrome)
 *  - Deference (content first, UI sutil)
 *  - Depth (blur layers, springs realistas)
 */

// ─── BACKGROUNDS (hierarquia iOS dark mode) ────────────────────────────

/**
 * iOS dark mode usa 4 níveis sistêmicos:
 *   systemBackground            #000000   — tela base
 *   secondarySystemBackground   #1C1C1E   — cards/sheets level 1
 *   tertiarySystemBackground    #2C2C2E   — nested cards
 *   quaternarySystemBackground  #3A3A3C   — elevated elements
 *
 * Nossa adaptação: primary é levemente "warm navy" (#050810) pra aurora
 * ter mais contraste, mas as elevadas seguem a escala Apple.
 */
export const bg = {
  /** Base — quase preto (Apple: #000000 puro em OLED; nós usamos um navy imperceptível pro aurora respirar) */
  base: '#050810',
  /** Mesmo que base — alias */
  space: '#050810',
  deep: '#050810',
  /** Level 1 — cards, sheets principais (equiv. secondarySystemBackground) */
  layer1: '#1C1C1E',
  /** Level 2 — cards nested, grouped (equiv. tertiarySystemBackground) */
  layer2: '#2C2C2E',
  /** Level 3 — elevated (menus, floating) */
  layer3: '#3A3A3C',
  /** Backdrop translúcido pra modals */
  fog: 'rgba(0, 0, 0, 0.56)',
} as const;

// ─── LABELS (hierarquia de texto iOS) ───────────────────────────────────

/**
 * iOS usa `#EBEBF5` como base com alphas decrescentes:
 *   label (primary):      #FFFFFF     (100%)
 *   secondaryLabel:       #EBEBF599   (60%)
 *   tertiaryLabel:        #EBEBF54C   (30%)
 *   quaternaryLabel:      #EBEBF52E   (18%)
 *
 * Toda hierarquia de texto deve usar esses 4 níveis. Não inventar.
 */
export const text = {
  primary: '#FFFFFF',
  secondary: 'rgba(235, 235, 245, 0.60)',
  tertiary: 'rgba(235, 235, 245, 0.30)',
  quaternary: 'rgba(235, 235, 245, 0.18)',
  /** Aliases legíveis */
  muted: 'rgba(235, 235, 245, 0.60)',
  dim: 'rgba(235, 235, 245, 0.30)',
  /** Texto sobre cores aurora/gold (legibilidade em gradiente claro) */
  onAurora: '#000000',
  onGold: '#1A0F00',
  /** Azul sistema (iOS adoption pra CTAs e links) */
  link: '#0A84FF',
} as const;

// ─── FILLS (glass/material sistema iOS) ─────────────────────────────────

/**
 * iOS fill scale — alpha sobre white. Usado em:
 *  - Pressable backgrounds (Material iOS)
 *  - Dividers, controls, chips
 *  - Glass effect acima de BlurView
 *
 *  Primary fill     #78788033   (20% opacity) — grouped backgrounds
 *  Secondary        #78788028   (16%)         — card hover
 *  Tertiary         #7676801E   (12%)         — inactive
 *  Quaternary       #74748014   (8%)          — subtle dividers
 */
export const fill = {
  primary: 'rgba(120, 120, 128, 0.20)',
  secondary: 'rgba(120, 120, 128, 0.16)',
  tertiary: 'rgba(118, 118, 128, 0.12)',
  quaternary: 'rgba(116, 116, 128, 0.08)',
} as const;

// ─── SURFACE (glassmorphism layers) ─────────────────────────────────────

/**
 * Glass surfaces são aplicadas sobre bg.base ou gradient backgrounds.
 * No iOS real, usar <BlurView> do expo-blur atrás — aqui só as cores base.
 */
export const surface = {
  /** Card glass level 1 — alpha bem baixo, para sentar sobre bg */
  glass: 'rgba(255, 255, 255, 0.05)',
  glassHover: 'rgba(255, 255, 255, 0.08)',
  glassActive: 'rgba(255, 255, 255, 0.12)',
  /** Borders — Apple usa separatorColor alpha */
  glassBorder: 'rgba(84, 84, 88, 0.65)', // Apple: opaqueSeparator 1C1C1E + 65%
  glassBorderSubtle: 'rgba(84, 84, 88, 0.35)',
  glassBorderActive: 'rgba(255, 255, 255, 0.20)',
  /** Separator puro iOS */
  separator: 'rgba(84, 84, 88, 0.35)', // Apple: nonOpaqueSeparator
} as const;

// ─── SYSTEM COLORS (Apple iOS 17 dark mode variants) ────────────────────

/**
 * Apple systemColors — dark mode variants (mais luminosos que light).
 * Fonte: HIG 2023 / SF Symbols reference.
 *
 * Regra: use systemColor pras ações universais (destrutivo = red, sucesso
 * = green). Aurora/gold SÓ pra accent/brand.
 */
export const system = {
  blue: '#0A84FF', // primary actions, links
  green: '#30D158', // success
  indigo: '#5E5CE6',
  orange: '#FF9F0A', // warning
  pink: '#FF375F',
  purple: '#BF5AF2',
  red: '#FF453A', // destructive
  teal: '#64D2FF', // info
  yellow: '#FFD60A',
  mint: '#66D4CF',
  cyan: '#64D2FF',
  brown: '#AC8E68',
  gray: '#8E8E93',
  gray2: '#636366',
  gray3: '#48484A',
  gray4: '#3A3A3C',
  gray5: '#2C2C2E',
  gray6: '#1C1C1E',
} as const;

// ─── SEMANTIC (aliases Apple → role-based) ─────────────────────────────

export const semantic = {
  success: system.green,
  successBg: 'rgba(48, 209, 88, 0.14)',
  successGlow: 'rgba(48, 209, 88, 0.40)',
  warning: system.orange,
  warningBg: 'rgba(255, 159, 10, 0.14)',
  danger: system.red,
  dangerBg: 'rgba(255, 69, 58, 0.14)',
  info: system.teal,
  infoBg: 'rgba(100, 210, 255, 0.14)',
  primary: system.blue,
  primaryBg: 'rgba(10, 132, 255, 0.14)',
} as const;

// ─── AURORA (brand accent — refined) ───────────────────────────────────

/**
 * Nossa assinatura, alinhada com system.teal + system.purple da Apple.
 * Mais refinada que v2 (menos neon, mais HIG).
 *
 * Uso: APENAS em hero/celebration/brand moments. NÃO usar em CTAs
 * genéricos — pra isso tem system.blue.
 */
export const aurora = {
  cyan: '#64D2FF', // = system.teal (Apple reference)
  iris: '#5E5CE6', // = system.indigo
  magenta: '#BF5AF2', // = system.purple
  cyanSoft: 'rgba(100, 210, 255, 0.18)',
  magentaSoft: 'rgba(191, 90, 242, 0.18)',
  cyanGlow: 'rgba(100, 210, 255, 0.42)',
  magentaGlow: 'rgba(191, 90, 242, 0.42)',
} as const;

// ─── PREMIUM (gold — Apple-inspired, elegant) ──────────────────────────

/**
 * Gold gradient refinado — mais próximo do Apple Watch titanium-gold
 * que do "néon amarelo". Uso: PRO badge, streak rewards, leaderboard top-3.
 */
export const premium = {
  gold: '#FFD60A', // = system.yellow (refinement)
  goldLight: '#FFE066',
  goldDark: '#CC9E00',
  goldSoft: 'rgba(255, 214, 10, 0.14)',
  goldGlow: 'rgba(255, 224, 102, 0.36)',
} as const;

// ─── PROGRAM COLORS ─────────────────────────────────────────────────────

export const program = {
  smiles: '#FF6B00',
  latampass: '#E2262C',
  tudoazul: '#00A9E0',
  livelo: '#FFB600',
  esfera: '#CB0A2F',
  multiplus: '#1A5CA8',
} as const;

// ─── SPACING (4-base) ───────────────────────────────────────────────────

/**
 * Apple HIG: baseline grid 4pt/8pt. Layouts grandes em multiples de 8.
 */
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

// ─── RADIUS (Apple continuous curve inspired) ──────────────────────────

/**
 * iOS adota "continuous rounding" (Apple squircle). Aqui usamos borderRadius
 * tradicional, mas com a cadência Apple:
 *  small control (buttons):  10-12
 *  card default:             14-18
 *  modal/sheet:              20-28 (grande no topo)
 *  full pill:                9999
 */
export const radius = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

// ─── TYPOGRAPHY ────────────────────────────────────────────────────────

/**
 * Inter tem métricas quase idênticas a SF Pro — substituto perfeito.
 * Apple HIG escala typography (iOS 17):
 *   LargeTitle      34pt bold    -0.41 tracking
 *   Title 1         28pt bold    -0.36
 *   Title 2         22pt bold    -0.28
 *   Title 3         20pt semibold
 *   Headline        17pt semibold
 *   Body            17pt regular
 *   Callout         16pt regular
 *   Subheadline     15pt regular
 *   Footnote        13pt regular
 *   Caption 1       12pt regular
 *   Caption 2       11pt regular
 */
export const type = {
  largeTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: -0.41,
  },
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
  /** Display enorme (para hero numbers, wallet value) — não-standard iOS */
  display: {
    fontFamily: 'Inter_700Bold',
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1.2,
  },
  /** Alias legados (compat com v2) */
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

// ─── SHADOWS ───────────────────────────────────────────────────────────

/**
 * iOS shadow: spread pequeno, offset Y específico, opacity baixa.
 * Aqui calibrado pra dark mode (shadows têm que aparecer em bg preto).
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 24,
    elevation: 14,
  },
  glowCyan: {
    shadowColor: aurora.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  glowMagenta: {
    shadowColor: aurora.magenta,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  glowGold: {
    shadowColor: premium.goldLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 12,
  },
  glowBlue: {
    shadowColor: system.blue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ─── GRADIENTS ─────────────────────────────────────────────────────────

export const gradients = {
  /** Aurora full — para heros (usa mais em `hero` que em CTAs) */
  aurora: [aurora.cyan, aurora.iris, aurora.magenta] as [string, string, string],
  auroraCyanMagenta: [aurora.cyan, aurora.magenta] as [string, string],
  /** CTA Apple-ish (blue) — uso primário pra ações */
  primaryApple: [system.blue, '#0060DF'] as [string, string],
  /** Hero bg escuro */
  heroBg: [bg.space, '#0B0E20', '#050810'] as [string, string, string],
  /** Muted aurora pra bg */
  hero: ['#0A1F42', '#2A0B4D', '#4D1A3A'] as [string, string, string],
  premium: [premium.goldDark, premium.gold, premium.goldLight] as [string, string, string],
  success: ['#0F8A3C', system.green, '#66E88A'] as [string, string, string],
  danger: ['#A30014', system.red, '#FF7A73'] as [string, string, string],
  /** Vertical glass sheen (top highlight) */
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
  disabled: 0.4, // Apple: opaque disabled
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
  shadow,
  gradients,
  opacity,
  zIndex,
} as const;

export type Tokens = typeof tokens;
export default tokens;

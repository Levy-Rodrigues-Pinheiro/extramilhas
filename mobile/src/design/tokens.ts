/**
 * Milhas Extras — Design tokens v2 ("Aurora")
 *
 * Direção visual: "Jet landing on glass".
 * - Background em deep-space navy com gradiente atmosférico
 * - Accent cyan→magenta (aurora) pra momentos heroicos
 * - Gold pra premium/rewards
 * - Glass surfaces (alpha low + blur) sobre o bg
 *
 * Mantém compat com `src/lib/theme.ts` (theme v1 continua funcionando em
 * screens não migradas). Novas telas e componentes primitives usam este.
 */

// ─── PALETTE ───────────────────────────────────────────────────────────

/**
 * Deep-space background. Não é preto puro — tem um roxo/azul quase
 * imperceptível que dá profundidade. Usado em gradient angular pra hero.
 */
export const bg = {
  space: '#070B18', // quase preto, atmosfera espacial
  deep: '#0A1020', // primary app bg
  layer1: '#0E1630', // cards, sheets
  layer2: '#121C3D', // elevated (modals, menus)
  layer3: '#182447', // hover, pressed state
  fog: 'rgba(14, 22, 48, 0.72)', // translucent para backdrops
} as const;

/**
 * Aurora gradient — assinatura visual. Cyan frio → magenta vibrante.
 * Usar em heroes, CTAs premium, indicators de progresso.
 */
export const aurora = {
  // Primary gradient stops
  cyan: '#22D3EE', // eletric cyan
  iris: '#818CF8', // bridge tone (indigo)
  magenta: '#E879F9', // vibrant pink
  // Soft version (pra backgrounds sutis)
  cyanSoft: 'rgba(34, 211, 238, 0.22)',
  magentaSoft: 'rgba(232, 121, 249, 0.22)',
  // Glow halos (para border-glow em cards ativos)
  cyanGlow: 'rgba(34, 211, 238, 0.45)',
  magentaGlow: 'rgba(232, 121, 249, 0.45)',
} as const;

/**
 * Premium — gold gradiente. Usar em PRO badge, streak rewards, leaderboard
 * top-3. NUNCA em CTA genérico.
 */
export const premium = {
  gold: '#F59E0B',
  goldLight: '#FBBF24',
  goldDark: '#B45309',
  goldSoft: 'rgba(245, 158, 11, 0.16)',
  goldGlow: 'rgba(251, 191, 36, 0.35)',
} as const;

/**
 * Text scale — alto contraste na primary, gradação clara.
 */
export const text = {
  primary: '#F8FAFC',
  secondary: '#CBD5E1',
  muted: '#94A3B8',
  dim: '#64748B',
  onAurora: '#030712', // texto sobre aurora gradient (legibilidade)
  onGold: '#1F1302',
} as const;

/**
 * Semantic colors — ações/estados. Mantém paleta tradicional mas afinada
 * pro dark mode (mais luminoso que os #10b981 padrão).
 */
export const semantic = {
  success: '#34D399',
  successBg: 'rgba(52, 211, 153, 0.14)',
  successGlow: 'rgba(52, 211, 153, 0.40)',
  warning: '#FBBF24',
  warningBg: 'rgba(251, 191, 36, 0.14)',
  danger: '#F87171',
  dangerBg: 'rgba(248, 113, 113, 0.14)',
  info: '#60A5FA',
  infoBg: 'rgba(96, 165, 250, 0.14)',
} as const;

/**
 * Surface — camadas translúcidas que sentam sobre o bg.space (glassmorphism).
 * Backdrop blur 20-32 recomendado (BlurView do expo em native, fallback bg).
 */
export const surface = {
  glass: 'rgba(255, 255, 255, 0.04)',
  glassHover: 'rgba(255, 255, 255, 0.07)',
  glassActive: 'rgba(255, 255, 255, 0.10)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBorderActive: 'rgba(255, 255, 255, 0.16)',
} as const;

/**
 * Logos de programs. Mantido aqui pra ter todas as cores num lugar.
 */
export const program = {
  smiles: '#FF6B00',
  latampass: '#E2262C',
  tudoazul: '#00A9E0',
  livelo: '#FFB600',
  esfera: '#CB0A2F',
  multiplus: '#1A5CA8',
} as const;

// ─── SPACING (compass scale) ───────────────────────────────────────────

/**
 * Escala 4-base (multiplo de 4 e 8). Maioria do design segue essa cadência;
 * nomeados por função, não por número, pra facilitar review.
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

// ─── RADIUS ────────────────────────────────────────────────────────────

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
 * Inter já está carregado via @expo-google-fonts/inter.
 * Hierarquia tight — 900 pra headlines hero, 500 pra body, 700 pra CTAs.
 */
export const type = {
  // Display (hero numbers, dashboard value)
  display: {
    fontFamily: 'Inter_900Black',
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1.6,
  },
  // H1 — screen titles
  h1: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.6,
  },
  // H2 — section headers
  h2: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  // H3 — card titles
  h3: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  // Body default
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  // Body emphasis
  bodyBold: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    lineHeight: 22,
  },
  // Small (metadata, captions)
  caption: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  // Micro (tags, badges)
  micro: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  // CTA button text
  cta: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
} as const;

// ─── SHADOWS ───────────────────────────────────────────────────────────

/**
 * Sombras calibradas para dark theme — baixa opacidade, spread maior.
 * Pra glow em elementos ativos, usar shadow.glow.* (com cor aurora).
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
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.32,
    shadowRadius: 28,
    elevation: 16,
  },
  // Glows — shadow colorizada pra elementos highlights
  glowCyan: {
    shadowColor: aurora.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  glowMagenta: {
    shadowColor: aurora.magenta,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
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
} as const;

// ─── GRADIENT PRESETS ──────────────────────────────────────────────────

/**
 * Presets usados pelo LinearGradient (expo-linear-gradient).
 * Sempre arrays de cores — direção é config do componente.
 */
export const gradients = {
  aurora: [aurora.cyan, aurora.iris, aurora.magenta] as [string, string, string],
  auroraCyanMagenta: [aurora.cyan, aurora.magenta] as [string, string],
  heroBg: [bg.space, '#0D1230', '#0A1020'] as [string, string, string],
  hero: ['#1E3A8A', '#701A75', '#831843'] as [string, string, string], // muted aurora pra hero bg
  premium: [premium.goldDark, premium.gold, premium.goldLight] as [string, string, string],
  success: ['#065F46', '#10B981', '#34D399'] as [string, string, string],
  danger: ['#7F1D1D', '#DC2626', '#F87171'] as [string, string, string],
  glassVertical: [
    'rgba(255,255,255,0.08)',
    'rgba(255,255,255,0.02)',
  ] as [string, string],
  glassSheenTop: [
    'rgba(255,255,255,0.12)',
    'rgba(255,255,255,0.00)',
  ] as [string, string],
} as const;

// ─── OPACITY SCALE ─────────────────────────────────────────────────────

export const opacity = {
  disabled: 0.42,
  pressed: 0.7,
  hover: 0.85,
  full: 1.0,
} as const;

// ─── Z-INDEX ───────────────────────────────────────────────────────────

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
  aurora,
  premium,
  text,
  semantic,
  surface,
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

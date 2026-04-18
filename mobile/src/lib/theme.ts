/**
 * Milhas Extras — Design System Tokens
 * Central source of truth for all colors, gradients, typography, spacing, and shadows.
 */

export const Colors = {
  // Backgrounds
  bg: {
    primary: '#0B1120',
    card: '#141C2F',
    cardHover: '#1A2540',
    elevated: '#1E293B',
    surface: '#101828',
  },

  // Primary (gradient-based)
  primary: {
    start: '#3B82F6',
    end: '#8B5CF6',
    solid: '#6366F1',
    muted: '#312E81',
    light: '#818CF8',
  },

  // Borders
  border: {
    default: '#1E293B',
    subtle: '#253349',
    active: '#818CF8',
  },

  // Text
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    muted: '#64748B',
    accent: '#818CF8',
  },

  // Semantic
  green: {
    primary: '#10B981',
    bg: '#10B98118',
    border: '#10B98140',
    glow: '#10B98150',
  },
  yellow: {
    primary: '#F59E0B',
    bg: '#F59E0B18',
    border: '#F59E0B40',
  },
  red: {
    primary: '#EF4444',
    bg: '#EF444418',
    border: '#EF444440',
  },

  // Programs
  program: {
    smiles: '#FF6B00',
    livelo: '#C41E3A',
    tudoazul: '#0033A0',
    latampass: '#E31837',
    esfera: '#00A651',
    multiplus: '#6B21A8',
  },

  // Plans
  plan: {
    free: { bg: '#1E293B', text: '#94A3B8' },
    premium: { bg: '#312E81', text: '#818CF8', border: '#4338CA' },
    pro: { bg: '#4C1D95', text: '#A78BFA', border: '#7C3AED' },
  },
} as const;

export const Gradients = {
  primary: ['#3B82F6', '#8B5CF6'] as const,
  header: ['#0B1120', '#141C2F'] as const,
  card: ['#141C2F', '#1A2540'] as const,
  premium: ['#4338CA', '#7C3AED'] as const,
  pro: ['#7C3AED', '#9333EA'] as const,
  profileHeader: ['#1E1B4B', '#312E81'] as const,
  imperdivel: ['#052E16', '#064E3B'] as const,

  // Program gradients
  smiles: ['#FF6B00', '#FF8A30'] as const,
  livelo: ['#C41E3A', '#E02D4D'] as const,
  tudoazul: ['#0033A0', '#1A56C4'] as const,
  latampass: ['#E31837', '#FF3050'] as const,
  esfera: ['#00A651', '#00C966'] as const,
  multiplus: ['#6B21A8', '#8B5CF6'] as const,
} as const;

export const Typography = {
  heading: {
    xl: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
    lg: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
    md: { fontSize: 18, fontWeight: '700' as const },
    sm: { fontSize: 15, fontWeight: '700' as const },
  },
  body: {
    lg: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
    md: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
    sm: { fontSize: 12, fontWeight: '500' as const },
  },
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.8 },
  caption: { fontSize: 11, fontWeight: '500' as const },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  }),
  tabBar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  xxl: 20,
  pill: 24,
  full: 9999,
} as const;

// Program gradient lookup by slug
export const getProgramGradient = (slug: string): readonly [string, string] => {
  const map: Record<string, readonly [string, string]> = {
    smiles: Gradients.smiles,
    livelo: Gradients.livelo,
    tudoazul: Gradients.tudoazul,
    latampass: Gradients.latampass,
    esfera: Gradients.esfera,
    multiplus: Gradients.multiplus,
  };
  return map[slug] ?? Gradients.primary;
};

export const getProgramColor = (slug: string): string => {
  const map: Record<string, string> = Colors.program;
  return (map as any)[slug] ?? Colors.primary.solid;
};

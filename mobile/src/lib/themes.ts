/**
 * Sistema de temas. Dark = atual (default), Light = novo.
 * Custom = Premium escolhe accent color.
 *
 * Cada theme expõe o mesmo shape, consumido via useTheme().
 * Consumers que usaram Colors direto continuam funcionando enquanto
 * migramos gradualmente pra useTheme() — Colors continua apontando
 * pro DARK como fallback.
 */

export type ThemeMode = 'dark' | 'light' | 'system';
export type AccentColor = '#3B82F6' | '#8B5CF6' | '#10B981' | '#EC4899' | '#F59E0B';

export const DEFAULT_ACCENT: AccentColor = '#3B82F6';
export const ACCENT_OPTIONS: AccentColor[] = [
  '#3B82F6', // azul (default)
  '#8B5CF6', // roxo
  '#10B981', // verde
  '#EC4899', // rosa
  '#F59E0B', // laranja
];

export interface ThemePalette {
  bg: {
    primary: string;
    card: string;
    cardHover: string;
    surface: string;
    elevated: string;
  };
  primary: {
    start: string;
    end: string;
    light: string;
    muted: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
  border: {
    subtle: string;
    default: string;
    strong: string;
  };
  green: { primary: string; bg: string; border: string };
  red: { primary: string; bg: string; border: string };
  yellow: { primary: string; bg: string; border: string };
  mode: 'dark' | 'light';
}

export const DARK_THEME: ThemePalette = {
  bg: {
    primary: '#0B1120',
    card: '#141C2F',
    cardHover: '#1A2540',
    surface: '#0F172A',
    elevated: '#1E293B',
  },
  primary: {
    start: '#3B82F6',
    end: '#8B5CF6',
    light: '#A78BFA',
    muted: '#3B2F66',
  },
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    muted: '#64748B',
    inverse: '#0B1120',
  },
  border: {
    subtle: '#1F2937',
    default: '#253349',
    strong: '#334155',
  },
  green: {
    primary: '#10B981',
    bg: '#10B98118',
    border: '#10B98140',
  },
  red: {
    primary: '#EF4444',
    bg: '#EF444418',
    border: '#EF444440',
  },
  yellow: {
    primary: '#F59E0B',
    bg: '#F59E0B18',
    border: '#F59E0B40',
  },
  mode: 'dark',
};

export const LIGHT_THEME: ThemePalette = {
  bg: {
    primary: '#FFFFFF',
    card: '#F8FAFC',
    cardHover: '#F1F5F9',
    surface: '#FAFAFA',
    elevated: '#FFFFFF',
  },
  primary: {
    start: '#3B82F6',
    end: '#8B5CF6',
    light: '#6366F1',
    muted: '#EEF2FF',
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    muted: '#94A3B8',
    inverse: '#FFFFFF',
  },
  border: {
    subtle: '#F1F5F9',
    default: '#E2E8F0',
    strong: '#CBD5E1',
  },
  green: {
    primary: '#059669',
    bg: '#D1FAE5',
    border: '#6EE7B7',
  },
  red: {
    primary: '#DC2626',
    bg: '#FEE2E2',
    border: '#FCA5A5',
  },
  yellow: {
    primary: '#D97706',
    bg: '#FEF3C7',
    border: '#FCD34D',
  },
  mode: 'light',
};

/**
 * High contrast variant — força preto/branco sólido. Aplica sobre qualquer
 * mode (dark → dark HC, light → light HC).
 */
export function highContrastOf(base: ThemePalette): ThemePalette {
  if (base.mode === 'dark') {
    return {
      ...base,
      bg: { primary: '#000000', card: '#0A0A0A', cardHover: '#141414', surface: '#000000', elevated: '#1A1A1A' },
      text: { primary: '#FFFFFF', secondary: '#FFFFFF', muted: '#CCCCCC', inverse: '#000000' },
      border: { subtle: '#FFFFFF', default: '#FFFFFF', strong: '#FFFFFF' },
    };
  }
  return {
    ...base,
    bg: { primary: '#FFFFFF', card: '#FFFFFF', cardHover: '#F5F5F5', surface: '#FFFFFF', elevated: '#FFFFFF' },
    text: { primary: '#000000', secondary: '#000000', muted: '#333333', inverse: '#FFFFFF' },
    border: { subtle: '#000000', default: '#000000', strong: '#000000' },
  };
}

/**
 * Aplica custom accent color ao tema base. Sobrescreve primary.start e
 * derivados (muted mais claro/escuro).
 */
export function withAccent(base: ThemePalette, accent: string): ThemePalette {
  // Derive muted (10% opacity) e light (desaturated) com hex simples
  const muted = accent + '22'; // 13% opacidade
  return {
    ...base,
    primary: {
      ...base.primary,
      start: accent,
      muted,
    },
  };
}

export function resolveTheme(params: {
  mode: ThemeMode;
  systemIsDark: boolean;
  highContrast: boolean;
  accent?: string | null;
}): ThemePalette {
  const isDark = params.mode === 'system' ? params.systemIsDark : params.mode === 'dark';
  let base = isDark ? DARK_THEME : LIGHT_THEME;
  if (params.accent) base = withAccent(base, params.accent);
  if (params.highContrast) base = highContrastOf(base);
  return base;
}

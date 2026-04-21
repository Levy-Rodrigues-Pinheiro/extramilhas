import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_ACCENT,
  resolveTheme,
  type AccentColor,
  type ThemeMode,
  type ThemePalette,
  DARK_THEME,
} from './themes';

/**
 * ThemeContext expõe:
 *   - palette atual (reativo)
 *   - mode (dark/light/system) + setters
 *   - accent (custom color)
 *   - highContrast toggle
 *   - fontScale (0.8 - 2.0) pra acessibilidade
 *   - dyslexiaMode (letter-spacing extra + line-height maior)
 *
 * Persiste TUDO em AsyncStorage chaves `theme-*`. Hidrata no mount.
 *
 * Fallback: se AsyncStorage falhar, usa dark + 1x scale.
 */

interface ThemeContextShape {
  palette: ThemePalette;
  mode: ThemeMode;
  accent: string | null;
  highContrast: boolean;
  fontScale: number;
  dyslexiaMode: boolean;
  setMode: (m: ThemeMode) => void;
  setAccent: (c: AccentColor | null) => void;
  setHighContrast: (v: boolean) => void;
  setFontScale: (v: number) => void;
  setDyslexiaMode: (v: boolean) => void;
  reset: () => void;
}

const ThemeContext = createContext<ThemeContextShape | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const systemIsDark = systemScheme === 'dark';

  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [accent, setAccentState] = useState<string | null>(null);
  const [highContrast, setHighContrastState] = useState<boolean>(false);
  const [fontScale, setFontScaleState] = useState<number>(1);
  const [dyslexiaMode, setDyslexiaModeState] = useState<boolean>(false);

  // Hidrata no mount
  useEffect(() => {
    (async () => {
      try {
        const [m, a, hc, fs, dys] = await Promise.all([
          AsyncStorage.getItem('theme-mode'),
          AsyncStorage.getItem('theme-accent'),
          AsyncStorage.getItem('theme-high-contrast'),
          AsyncStorage.getItem('theme-font-scale'),
          AsyncStorage.getItem('theme-dyslexia'),
        ]);
        if (m === 'dark' || m === 'light' || m === 'system') setModeState(m);
        if (a) setAccentState(a);
        if (hc === '1') setHighContrastState(true);
        if (fs) {
          const n = parseFloat(fs);
          if (!isNaN(n) && n >= 0.8 && n <= 2.0) setFontScaleState(n);
        }
        if (dys === '1') setDyslexiaModeState(true);
      } catch {
        /* fallback silencioso pra defaults */
      }
    })();
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem('theme-mode', m).catch(() => {});
  };
  const setAccent = (c: AccentColor | null) => {
    setAccentState(c);
    if (c) AsyncStorage.setItem('theme-accent', c).catch(() => {});
    else AsyncStorage.removeItem('theme-accent').catch(() => {});
  };
  const setHighContrast = (v: boolean) => {
    setHighContrastState(v);
    AsyncStorage.setItem('theme-high-contrast', v ? '1' : '0').catch(() => {});
  };
  const setFontScale = (v: number) => {
    const clamped = Math.max(0.8, Math.min(2.0, v));
    setFontScaleState(clamped);
    AsyncStorage.setItem('theme-font-scale', String(clamped)).catch(() => {});
  };
  const setDyslexiaMode = (v: boolean) => {
    setDyslexiaModeState(v);
    AsyncStorage.setItem('theme-dyslexia', v ? '1' : '0').catch(() => {});
  };

  const reset = () => {
    setModeState('dark');
    setAccentState(null);
    setHighContrastState(false);
    setFontScaleState(1);
    setDyslexiaModeState(false);
    Promise.all([
      AsyncStorage.removeItem('theme-mode'),
      AsyncStorage.removeItem('theme-accent'),
      AsyncStorage.removeItem('theme-high-contrast'),
      AsyncStorage.removeItem('theme-font-scale'),
      AsyncStorage.removeItem('theme-dyslexia'),
    ]).catch(() => {});
  };

  const palette = useMemo(
    () => resolveTheme({ mode, systemIsDark, highContrast, accent }),
    [mode, systemIsDark, highContrast, accent],
  );

  const value: ThemeContextShape = {
    palette,
    mode,
    accent,
    highContrast,
    fontScale,
    dyslexiaMode,
    setMode,
    setAccent,
    setHighContrast,
    setFontScale,
    setDyslexiaMode,
    reset,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextShape {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback safe — permite componentes serem usados fora de provider
    // durante testes/preview. Palette = dark default.
    return {
      palette: DARK_THEME,
      mode: 'dark',
      accent: null,
      highContrast: false,
      fontScale: 1,
      dyslexiaMode: false,
      setMode: () => {},
      setAccent: () => {},
      setHighContrast: () => {},
      setFontScale: () => {},
      setDyslexiaMode: () => {},
      reset: () => {},
    };
  }
  return ctx;
}

/**
 * Helper pra converter props de fontSize considerando fontScale + dyslexia.
 * Uso: const fs = useScaledFontSize(14) → valor final
 */
export function useScaledFontSize(base: number): number {
  const { fontScale } = useTheme();
  return Math.round(base * fontScale);
}

/**
 * Hook de text styles comum com dyslexia-aware.
 */
export function useDyslexiaTextStyle() {
  const { dyslexiaMode } = useTheme();
  if (!dyslexiaMode) return {};
  return {
    letterSpacing: 0.5,
    lineHeight: undefined, // deixa Text calcular 1.6 via StyleSheet quando aplicado
    fontWeight: '500' as const,
  };
}

import { useMemo } from 'react';
import type { StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import type { ThemePalette } from './themes';

/**
 * Helper pra stylesheet reativa ao theme. Uso:
 *
 *   const makeStyles = (palette) => StyleSheet.create({
 *     bg: { backgroundColor: palette.bg.primary }
 *   });
 *
 *   const styles = useThemedStyles(makeStyles);
 *
 * Re-cria o stylesheet só quando palette muda (useMemo).
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  fn: (palette: ThemePalette) => T,
): T {
  const { palette } = useTheme();
  return useMemo(() => fn(palette), [palette, fn]);
}

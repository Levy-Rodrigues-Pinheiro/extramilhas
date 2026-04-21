import React from 'react';
import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context';
import { useTheme } from '../lib/ThemeProvider';

/**
 * Drop-in replacement pro SafeAreaView que aplica bg do theme atual.
 * Migração gradual das telas: trocar `<SafeAreaView>` por `<ThemedSafeArea>`
 * passa a reagir ao theme toggle sem mais mudanças.
 *
 * Uso:
 *   <ThemedSafeArea edges={['top']}>...</ThemedSafeArea>
 */
export function ThemedSafeArea({ style, ...rest }: SafeAreaViewProps) {
  const { palette } = useTheme();
  return (
    <SafeAreaView
      {...rest}
      style={[{ flex: 1, backgroundColor: palette.bg.primary }, style]}
    />
  );
}

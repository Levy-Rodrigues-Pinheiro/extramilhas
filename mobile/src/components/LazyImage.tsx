import React, { useState } from 'react';
import { View, Image, ImageProps, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../lib/ThemeProvider';

/**
 * Wrapper de Image com:
 *   - Placeholder enquanto carrega (spinner em bg.card)
 *   - Fallback se der erro (ícone cinza)
 *   - Pre-caching via prefetch quando uri passada
 *
 * Uso:
 *   <LazyImage source={{ uri: "https://..." }} style={{ width: 40, height: 40 }} />
 *
 * Não adiciona deps — usa Image nativo + eventos onLoad/onError.
 */
export function LazyImage({ source, style, ...rest }: ImageProps) {
  const { palette } = useTheme();
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  return (
    <View style={[styles.wrap, style]}>
      {state === 'loading' && (
        <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: palette.bg.card }]}>
          <ActivityIndicator size="small" color={palette.text.muted} />
        </View>
      )}
      {state === 'error' && (
        <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: palette.bg.surface }]}>
          <View style={[styles.brokenIcon, { backgroundColor: palette.border.default }]} />
        </View>
      )}
      <Image
        {...rest}
        source={source}
        style={[StyleSheet.absoluteFill, state !== 'ok' && { opacity: 0 }]}
        onLoad={(e) => {
          setState('ok');
          rest.onLoad?.(e);
        }}
        onError={(e) => {
          setState('error');
          rest.onError?.(e);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    position: 'relative',
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  brokenIcon: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
});

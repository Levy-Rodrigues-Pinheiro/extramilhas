/**
 * ScrollDrivenHeader — hero que morfa em pill header ao scroll down.
 *
 * Inspiração: Apple Music/Wallet/Photos. O hero header (grande title,
 * hero image) colapsa elegantemente em uma barra compacta quando o user
 * scrolla. Não é fade — é *morph* (shared element transition).
 *
 * Como usar:
 *   const scrollY = useSharedValue(0);
 *   const scrollHandler = useAnimatedScrollHandler({
 *     onScroll: e => { scrollY.value = e.contentOffset.y; }
 *   });
 *
 *   <ScrollDrivenHeader
 *     scrollY={scrollY}
 *     expandedTitle="Carteira"
 *     expandedSubtitle="Seu patrimônio em milhas"
 *     compactTitle="R$ 12.453,00"
 *     heroContent={<WalletHero />}
 *   />
 *   <AnimatedScrollView onScroll={scrollHandler}>...</AnimatedScrollView>
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import { surface, text as textTokens, space } from '../../design/tokens';

type Props = {
  scrollY: SharedValue<number>;
  /** Title grande (mostrado quando expanded) */
  expandedTitle: string;
  expandedSubtitle?: string;
  /** Title compacto (mostrado quando collapsed — ex: valor animado) */
  compactTitle?: string;
  /** Conteúdo do hero (card, gradient, etc) */
  heroContent: React.ReactNode;
  /** Altura expandida do hero (default 280) */
  expandedHeight?: number;
  /** Altura collapsed (padrão 56) */
  collapsedHeight?: number;
  /** Back button */
  onBack?: () => void;
  /** Ação à direita (opcional) */
  rightAction?: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    onPress: () => void;
    accessibilityLabel?: string;
  };
};

export function ScrollDrivenHeader({
  scrollY,
  expandedTitle,
  expandedSubtitle,
  compactTitle,
  heroContent,
  expandedHeight = 280,
  collapsedHeight = 56,
  onBack,
  rightAction,
}: Props) {
  const range = expandedHeight - collapsedHeight;

  // Container altura — de expanded → collapsed ao scrollar
  const containerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, range],
      [expandedHeight, collapsedHeight],
      Extrapolation.CLAMP,
    );
    return { height };
  });

  // Hero content desaparece + move pra cima
  const heroStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, range * 0.5, range * 0.9],
      [1, 0.4, 0],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [0, range],
      [0, -40],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollY.value,
      [0, range],
      [1, 0.88],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      transform: [{ translateY }, { scale }],
    };
  });

  // Large title aparece no expanded, some no collapsed
  const largeTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, range * 0.35],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  // Compact title (aparece quando collapsed)
  const compactTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [range * 0.5, range * 0.9],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [range * 0.5, range * 0.9],
      [8, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // Border bottom aparece quando colapsa
  const borderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [range * 0.7, range],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  // BG blur simulation — aumenta alpha quando colapsa
  const bgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [range * 0.4, range],
      [0, 0.92],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Solid BG que aparece quando colapsa (simula backdrop-blur) */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.bg, bgStyle]}
        pointerEvents="none"
      />

      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* Top bar: always visible (back + right action + compact title) */}
        <View style={styles.topBar}>
          {onBack && (
            <PressableScale
              onPress={onBack}
              haptic="tap"
              style={styles.iconBtn}
            >
              <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
            </PressableScale>
          )}

          {/* Compact title centered (collapsed state) */}
          {compactTitle && (
            <Animated.View style={[styles.compactTitleWrap, compactTitleStyle]}>
              <Text style={styles.compactTitle} numberOfLines={1}>
                {compactTitle}
              </Text>
            </Animated.View>
          )}

          <View style={{ flex: 1 }} />

          {rightAction && (
            <PressableScale
              onPress={rightAction.onPress}
              haptic="tap"
              accessibilityLabel={rightAction.accessibilityLabel}
              style={styles.iconBtn}
            >
              <Ionicons
                name={rightAction.icon}
                size={20}
                color={textTokens.primary}
              />
            </PressableScale>
          )}
        </View>

        {/* Large title (expanded state) */}
        <Animated.View
          style={[styles.largeTitleWrap, largeTitleStyle]}
          pointerEvents="none"
        >
          <Text style={styles.largeTitle}>{expandedTitle}</Text>
          {expandedSubtitle && (
            <Text style={styles.expandedSubtitle}>{expandedSubtitle}</Text>
          )}
        </Animated.View>

        {/* Hero content */}
        <Animated.View
          style={[styles.hero, heroStyle]}
          pointerEvents="box-none"
        >
          {heroContent}
        </Animated.View>
      </SafeAreaView>

      {/* Bottom separator (only when collapsed) */}
      <Animated.View style={[styles.separator, borderStyle]} pointerEvents="none" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 10,
  },
  bg: {
    backgroundColor: 'rgba(10, 16, 32, 0.94)',
    borderBottomWidth: 1,
    borderBottomColor: surface.separator,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: 6,
    minHeight: 44,
    zIndex: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: surface.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: surface.glassBorder,
  },
  compactTitleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    ...Platform.select({ ios: { paddingTop: 6 }, default: { paddingTop: 6 } }),
  },
  compactTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  largeTitleWrap: {
    paddingHorizontal: space.md,
    paddingTop: 8,
  },
  largeTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_900Black',
    fontSize: 34,
    letterSpacing: -0.8,
  },
  expandedSubtitle: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    marginTop: 2,
  },
  hero: {
    flex: 1,
    paddingTop: space.md,
    paddingHorizontal: space.md,
  },
  separator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: surface.separator,
  },
});

export default ScrollDrivenHeader;

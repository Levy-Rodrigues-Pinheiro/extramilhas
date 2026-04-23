import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  withSpring,
  Extrapolation,
} from 'react-native-reanimated';
import {
  AuroraBackground,
  AuroraButton,
  PressableScale,
  aurora,
  premium,
  semantic,
  surface,
  text as textTokens,
  space,
  gradients,
  motion,
  haptics,
} from '../../src/components/primitives';

const { width: SCREEN_W } = Dimensions.get('window');
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

type Slide = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  highlight: string; // destaque específico
  color: string;
};

const SLIDES: Slide[] = [
  {
    id: '1',
    icon: 'airplane',
    color: aurora.cyan,
    title: 'Todas as milhas num só lugar',
    highlight: '5 programas',
    description:
      'Smiles, Livelo, TudoAzul, Latam Pass e Esfera — sem abrir 5 apps, sem catar promoção em grupo de Telegram.',
  },
  {
    id: '2',
    icon: 'notifications',
    color: aurora.magenta,
    title: 'Alertas que sabem sua hora',
    highlight: 'Push em <60s',
    description:
      'Bônus de transferência acima do seu limite? Oferta única do dia? A gente avisa antes dos grupos.',
  },
  {
    id: '3',
    icon: 'trending-up',
    color: premium.goldLight,
    title: 'Arbitrage que vira dinheiro',
    highlight: 'Ganhe R$',
    description:
      'A gente calcula em R$ reais quanto você ganha cada vez que uma transferência bonificada aparece.',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      haptics.select();
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    } else {
      haptics.medium();
      router.replace('/(auth)/login');
    }
  };

  const handleSkip = () => {
    haptics.tap();
    router.replace('/(auth)/login');
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (index !== currentIndex) {
      haptics.select();
      setCurrentIndex(index);
    }
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <AuroraBackground intensity="hero" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Skip */}
        <View style={styles.topRow}>
          <View style={{ flex: 1 }} />
          <PressableScale onPress={handleSkip} haptic="tap" style={styles.skipBtn}>
            <Text style={styles.skipText}>Pular</Text>
            <Ionicons name="chevron-forward" size={14} color={textTokens.muted} />
          </PressableScale>
        </View>

        {/* Slides */}
        <AnimatedFlatList
          ref={flatListRef as any}
          data={SLIDES}
          keyExtractor={(item: any) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          renderItem={({ item, index }: any) => (
            <SlidePane slide={item} index={index} scrollX={scrollX} />
          )}
        />

        {/* Worm indicator */}
        <View style={styles.indicatorRow}>
          <WormIndicator scrollX={scrollX} total={SLIDES.length} />
        </View>

        {/* Next / Start button */}
        <View style={styles.ctaBox}>
          <AuroraButton
            label={isLast ? 'Começar agora' : 'Próximo'}
            onPress={handleNext}
            variant={isLast ? 'primary' : 'ghost'}
            size="lg"
            icon={isLast ? 'rocket' : 'arrow-forward'}
            iconPosition="right"
            fullWidth
            haptic={isLast ? 'medium' : 'tap'}
          />
        </View>
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── SlidePane ──────────────────────────────────────────────────────────

function SlidePane({
  slide,
  index,
  scrollX,
}: {
  slide: Slide;
  index: number;
  scrollX: Animated.SharedValue<number>;
}) {
  // Parallax: ícone move MAIS que texto quando o user desliza
  const inputRange = [
    (index - 1) * SCREEN_W,
    index * SCREEN_W,
    (index + 1) * SCREEN_W,
  ];

  const illustrationStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          scrollX.value,
          inputRange,
          [-120, 0, 120],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(
          scrollX.value,
          inputRange,
          [0.8, 1, 0.8],
          Extrapolation.CLAMP,
        ),
      },
    ],
    opacity: interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolation.CLAMP,
    ),
  }));

  const titleStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          scrollX.value,
          inputRange,
          [-50, 0, 50],
          Extrapolation.CLAMP,
        ),
      },
    ],
    opacity: interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const descriptionStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          scrollX.value,
          inputRange,
          [-30, 0, 30],
          Extrapolation.CLAMP,
        ),
      },
    ],
    opacity: interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View style={styles.slide}>
      {/* Illustration — parallax layer 1 (fastest) */}
      <Animated.View style={[styles.illustration, illustrationStyle]}>
        {/* Multi-halo */}
        <View style={[styles.halo1, { backgroundColor: `${slide.color}30` }]} />
        <View style={[styles.halo2, { backgroundColor: `${slide.color}15` }]} />
        <LinearGradient
          colors={[`${slide.color}EE`, `${slide.color}77`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconWrap}
        >
          <Ionicons name={slide.icon} size={92} color="#fff" />
        </LinearGradient>
      </Animated.View>

      {/* Highlight tag */}
      <Animated.View style={[styles.highlightTag, titleStyle]}>
        <View
          style={[
            styles.highlightInner,
            { backgroundColor: `${slide.color}1F`, borderColor: `${slide.color}44` },
          ]}
        >
          <View style={[styles.highlightDot, { backgroundColor: slide.color }]} />
          <Text style={[styles.highlightText, { color: slide.color }]}>
            {slide.highlight}
          </Text>
        </View>
      </Animated.View>

      {/* Title — parallax layer 2 */}
      <Animated.Text style={[styles.title, titleStyle]}>{slide.title}</Animated.Text>

      {/* Description — parallax layer 3 (slowest) */}
      <Animated.Text style={[styles.description, descriptionStyle]}>
        {slide.description}
      </Animated.Text>
    </View>
  );
}

// ─── WormIndicator ──────────────────────────────────────────────────────

function WormIndicator({
  scrollX,
  total,
}: {
  scrollX: Animated.SharedValue<number>;
  total: number;
}) {
  return (
    <View style={styles.indicator}>
      {/* Dot frios (background) */}
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={styles.dotBase} />
      ))}
      {/* Worm (sobrepõe) — stretches entre dots */}
      <Worm scrollX={scrollX} total={total} />
    </View>
  );
}

function Worm({ scrollX, total }: { scrollX: Animated.SharedValue<number>; total: number }) {
  const DOT_SIZE = 8;
  const GAP = 12;
  const TOTAL_WIDTH = total * DOT_SIZE + (total - 1) * GAP;

  const style = useAnimatedStyle(() => {
    const pageProgress = scrollX.value / SCREEN_W;
    const floor = Math.floor(pageProgress);
    const frac = pageProgress - floor;
    const slotWidth = DOT_SIZE + GAP;

    // Posicao: quando em transição, worm estica entre 2 dots
    const baseLeft = floor * slotWidth;
    const stretchFactor = Math.sin(frac * Math.PI); // pico no meio
    const width = DOT_SIZE + stretchFactor * slotWidth * 1.2;

    return {
      left: baseLeft - stretchFactor * 4, // ligeiro shift pra equilibrar
      width,
    };
  });

  return <Animated.View style={[styles.worm, style]} />;
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    paddingHorizontal: space.md,
    paddingVertical: 8,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderColor: surface.glassBorder,
  },
  skipText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },

  slide: {
    width: SCREEN_W,
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingTop: 20,
  },
  illustration: {
    width: SCREEN_W * 0.72,
    height: SCREEN_W * 0.72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 44,
    position: 'relative',
  },
  halo1: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    opacity: 0.4,
  },
  halo2: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    borderRadius: 999,
    opacity: 0.3,
  },
  iconWrap: {
    width: '70%',
    height: '70%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: aurora.magenta,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 18,
  },

  highlightTag: {
    marginBottom: space.md,
  },
  highlightInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  highlightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  highlightText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  title: {
    fontFamily: 'Inter_900Black',
    fontSize: 28,
    lineHeight: 34,
    color: textTokens.primary,
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.6,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 23,
    color: textTokens.secondary,
    textAlign: 'center',
    paddingHorizontal: 12,
  },

  indicatorRow: {
    alignItems: 'center',
    marginVertical: space.lg,
  },
  indicator: {
    flexDirection: 'row',
    gap: 12,
    position: 'relative',
    padding: 4,
  },
  dotBase: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  worm: {
    position: 'absolute',
    top: 4,
    height: 8,
    borderRadius: 4,
    backgroundColor: aurora.cyan,
    shadowColor: aurora.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },

  ctaBox: {
    paddingHorizontal: space.xl,
    paddingBottom: space.lg,
  },
});

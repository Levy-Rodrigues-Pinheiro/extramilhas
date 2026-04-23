/**
 * WrappedStoryStack — full-screen vertical story stack tipo Spotify Wrapped
 * / Apple Fitness Year in Review.
 *
 * Cada "story" é uma tela cheia com:
 *  - Gradient background custom
 *  - Hero visual (number, chart, ranking...)
 *  - Title + description
 *  - Progress bars topo (tipo Instagram stories)
 *  - Swipe/tap pra navegar
 *  - Auto-advance opcional (default 5s)
 *
 * Apple-level details:
 *  - Cada story morfa elegantemente (fade + slight scale) pra próxima
 *  - Progress bar preenche dinamicamente
 *  - Pause on press hold
 *  - Swipe right back, swipe left forward (gesture-first)
 *  - Tap left half = back, tap right half = forward
 *
 * Uso:
 *   <WrappedStoryStack
 *     stories={[
 *       { background: gradients.aurora, render: (progress) => <Story1 /> },
 *       ...
 *     ]}
 *     onFinish={() => router.back()}
 *   />
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  SharedValue,
  useAnimatedProps,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { text as textTokens, space } from '../../design/tokens';
import { haptics } from '../../design/haptics';
import { useReduceMotion } from '../../design/hooks';
import { PressableScale } from './PressableScale';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export type WrappedStory = {
  /** Background — pode ser gradient array ou cor sólida */
  background: [string, string, string] | [string, string] | string;
  /** Render content central — recebe progress 0-1 pra sync anim */
  render: (progress: SharedValue<number>) => React.ReactNode;
  /** Duration custom (default 5000ms) */
  duration?: number;
};

type Props = {
  stories: WrappedStory[];
  onFinish: () => void;
  onClose?: () => void;
  defaultDuration?: number;
};

export function WrappedStoryStack({
  stories,
  onFinish,
  onClose,
  defaultDuration = 5000,
}: Props) {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);
  const paused = useSharedValue(false);
  const [pausedState, setPausedState] = useState(false);

  const currentStory = stories[index];
  const duration = currentStory?.duration ?? defaultDuration;

  const goNext = () => {
    haptics.select();
    if (index < stories.length - 1) {
      setIndex(index + 1);
      progress.value = 0;
    } else {
      onFinish();
    }
  };

  const goPrev = () => {
    haptics.select();
    if (index > 0) {
      setIndex(index - 1);
      progress.value = 0;
    }
  };

  // Auto-advance — loop infinito do progress enquanto não pausado
  useEffect(() => {
    if (pausedState || reduceMotion) return;
    progress.value = 0;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const ratio = Math.min(1, elapsed / duration);
      progress.value = ratio;
      if (ratio >= 1) {
        clearInterval(interval);
        goNext();
      }
    }, 50);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, pausedState, duration]);

  // Gesture: tap left = back, tap right = next, long press = pause
  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((e) => {
      if (e.x < SCREEN_W / 3) {
        runOnJS(goPrev)();
      } else {
        runOnJS(goNext)();
      }
    });

  const longPress = Gesture.LongPress()
    .minDuration(200)
    .onBegin(() => {
      paused.value = true;
      runOnJS(setPausedState)(true);
    })
    .onFinalize(() => {
      paused.value = false;
      runOnJS(setPausedState)(false);
    });

  const swipe = Gesture.Pan()
    .activeOffsetY([-20, 20])
    .onEnd((e) => {
      if (e.translationY < -50 || e.velocityY < -500) {
        // Swipe up = close
        runOnJS(onFinish)();
      }
    });

  const composed = Gesture.Exclusive(longPress, swipe, tap);

  const bg = currentStory?.background;
  const isGradient = Array.isArray(bg);

  return (
    <View style={styles.root}>
      <GestureDetector gesture={composed}>
        <Animated.View
          key={`story-${index}`}
          entering={FadeIn.duration(280)}
          exiting={FadeOut.duration(200)}
          style={styles.storyContainer}
        >
          {isGradient ? (
            <LinearGradient
              colors={bg as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: bg as string },
              ]}
            />
          )}

          {/* Darken overlay pra legibilidade */}
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.4)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {currentStory?.render(progress)}
        </Animated.View>
      </GestureDetector>

      {/* Top progress bars (stories-style) */}
      <View style={styles.topBar}>
        <View style={styles.progressRow}>
          {stories.map((_, i) => (
            <ProgressSeg key={i} index={i} currentIndex={index} progress={progress} />
          ))}
        </View>
        <View style={styles.controlsRow}>
          <Pressable
            onPress={() => {
              haptics.tap();
              onClose?.();
              onFinish();
            }}
            hitSlop={10}
          >
            <Ionicons name="close" size={22} color={textTokens.primary} />
          </Pressable>
        </View>
      </View>

      {/* Hint bottom — "swipe up to close" */}
      {index === 0 && (
        <View style={styles.bottomHint} pointerEvents="none">
          <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.45)" />
          <Animated.Text style={styles.hintText}>arraste pra cima pra fechar</Animated.Text>
        </View>
      )}
    </View>
  );
}

// ─── ProgressSeg (barrinhas no topo) ───────────────────────────────────

function ProgressSeg({
  index,
  currentIndex,
  progress,
}: {
  index: number;
  currentIndex: number;
  progress: SharedValue<number>;
}) {
  const width = useSharedValue(0);

  useEffect(() => {
    if (index < currentIndex) {
      width.value = withTiming(100, { duration: 100 });
    } else if (index > currentIndex) {
      width.value = 0;
    }
  }, [index, currentIndex, width]);

  const fillStyle = useAnimatedStyle(() => {
    if (index < currentIndex) {
      return { width: '100%' };
    }
    if (index > currentIndex) {
      return { width: '0%' };
    }
    return { width: `${progress.value * 100}%` as any };
  });

  return (
    <View style={styles.progressSeg}>
      <Animated.View style={[styles.progressFill, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 52,
    paddingHorizontal: space.md,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  progressSeg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.26)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bottomHint: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 4,
  },
  hintText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 0.2,
  },
});

export default WrappedStoryStack;

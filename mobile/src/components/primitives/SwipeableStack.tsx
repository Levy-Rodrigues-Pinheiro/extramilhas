/**
 * SwipeableStack — deck de cards estilo Tinder/Bumble, mas polido Apple-level.
 *
 * Interações:
 *  - Pan gesture no card topo → translateX + rotateZ proporcional
 *  - Label "LIKE" / "NOPE" aparece com opacity conforme direção
 *  - Threshold 120px ou velocity 500: card "voa" offscreen + next card emerge
 *  - Spring-back elegante se não passou do threshold
 *  - Stack visual: card N-1 atrás com scale 0.94 + offset Y
 *  - Card fly-out com spring bouncy + haptic impactMedium
 *  - Botões centrais (skip/like) opcional pra users não-gesture
 *  - Empty state quando acabam
 *
 * Uso:
 *   <SwipeableStack
 *     data={cards}
 *     renderCard={(item, index) => <CardX item={item} />}
 *     onSwipeLeft={(item) => skipCard(item)}
 *     onSwipeRight={(item) => likeCard(item)}
 *     onEnd={() => <EmptyState />}
 *   />
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import {
  semantic,
  surface,
  text as textTokens,
  space,
  aurora,
} from '../../design/tokens';
import { motion } from '../../design/motion';
import { haptics } from '../../design/haptics';
import { useReduceMotion } from '../../design/hooks';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.28;
const ROTATION_FACTOR = 12; // graus máximos

type Props<T> = {
  data: T[];
  renderCard: (item: T, index: number, isTop: boolean) => React.ReactNode;
  onSwipeLeft?: (item: T, index: number) => void;
  onSwipeRight?: (item: T, index: number) => void;
  /** Render quando acabam cards */
  onEnd?: () => React.ReactNode;
  /** Mostrar botões skip/like abaixo (default true) */
  showButtons?: boolean;
  /** Labels de swipe — default "NÃO" / "QUERO" */
  leftLabel?: string;
  rightLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function SwipeableStack<T>({
  data,
  renderCard,
  onSwipeLeft,
  onSwipeRight,
  onEnd,
  showButtons = true,
  leftLabel = 'NÃO',
  rightLabel = 'QUERO',
  style,
}: Props<T>) {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReduceMotion();

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotateZ = useSharedValue(0);

  const current = data[index];
  const next = data[index + 1];
  const hasItems = index < data.length;

  const finalize = (direction: 'left' | 'right') => {
    if (!current) return;
    if (direction === 'left') onSwipeLeft?.(current, index);
    else onSwipeRight?.(current, index);

    // Reset shared values + avança index
    translateX.value = 0;
    translateY.value = 0;
    rotateZ.value = 0;
    setIndex((i) => i + 1);
  };

  const flyOut = (direction: 'left' | 'right') => {
    haptics.medium();
    const targetX = direction === 'right' ? SCREEN_W * 1.4 : -SCREEN_W * 1.4;
    translateX.value = withTiming(targetX, {
      duration: 320,
      easing: motion.curve.accelerated,
    });
    translateY.value = withTiming(translateY.value + 40, { duration: 320 });
    rotateZ.value = withTiming(direction === 'right' ? ROTATION_FACTOR : -ROTATION_FACTOR, {
      duration: 320,
    });
    setTimeout(() => finalize(direction), 260);
  };

  const pan = React.useMemo(() => {
    return Gesture.Pan()
      .onUpdate((e) => {
        if (!hasItems || reduceMotion) return;
        translateX.value = e.translationX;
        translateY.value = e.translationY * 0.3;
        rotateZ.value = interpolate(
          e.translationX,
          [-SCREEN_W, 0, SCREEN_W],
          [-ROTATION_FACTOR, 0, ROTATION_FACTOR],
          Extrapolation.CLAMP,
        );
      })
      .onEnd((e) => {
        if (!hasItems) return;
        const passed =
          Math.abs(e.translationX) > SWIPE_THRESHOLD ||
          Math.abs(e.velocityX) > 500;

        if (passed) {
          const direction = e.translationX > 0 ? 'right' : 'left';
          runOnJS(flyOut)(direction);
        } else {
          // Spring back
          translateX.value = withSpring(0, motion.springConfig.settled);
          translateY.value = withSpring(0, motion.springConfig.settled);
          rotateZ.value = withSpring(0, motion.springConfig.settled);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasItems, index, reduceMotion]);

  const topCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotateZ.value}deg` },
    ],
  }));

  const nextCardStyle = useAnimatedStyle(() => {
    // Próximo card cresce conforme o topo é arrastado
    const progress = Math.abs(translateX.value) / SWIPE_THRESHOLD;
    const scale = interpolate(progress, [0, 1], [0.94, 1], Extrapolation.CLAMP);
    const translateY = interpolate(progress, [0, 1], [14, 0], Extrapolation.CLAMP);
    return {
      transform: [{ scale }, { translateY }],
    };
  });

  // Labels (NÃO / QUERO) conforme direção
  const leftLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        rotate: `-12deg`,
      },
    ],
  }));

  const rightLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        rotate: `12deg`,
      },
    ],
  }));

  if (!hasItems) {
    return (
      <Animated.View
        style={[styles.root, style]}
        entering={FadeIn.duration(motion.timing.medium)}
      >
        {onEnd?.()}
      </Animated.View>
    );
  }

  return (
    <View style={[styles.root, style]}>
      {/* Card N+2 (atrás de tudo, sutil) */}
      {data[index + 2] && (
        <View style={[styles.cardSlot, { transform: [{ scale: 0.88 }, { translateY: 28 }] }]}>
          {renderCard(data[index + 2], index + 2, false)}
        </View>
      )}

      {/* Card N+1 (próximo) */}
      {next && (
        <Animated.View style={[styles.cardSlot, nextCardStyle]}>
          {renderCard(next, index + 1, false)}
        </Animated.View>
      )}

      {/* Card topo (o atual) */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.cardSlot, topCardStyle]}>
          {renderCard(current, index, true)}

          {/* NÃO label */}
          <Animated.View style={[styles.labelLeft, leftLabelStyle]} pointerEvents="none">
            <View style={[styles.labelBox, { borderColor: semantic.danger }]}>
              <Ionicons name="close" size={22} color={semantic.danger} />
              <Animated.Text style={[styles.labelText, { color: semantic.danger }]}>
                {leftLabel}
              </Animated.Text>
            </View>
          </Animated.View>

          {/* QUERO label */}
          <Animated.View style={[styles.labelRight, rightLabelStyle]} pointerEvents="none">
            <View style={[styles.labelBox, { borderColor: semantic.success }]}>
              <Ionicons name="heart" size={22} color={semantic.success} />
              <Animated.Text style={[styles.labelText, { color: semantic.success }]}>
                {rightLabel}
              </Animated.Text>
            </View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* Action buttons */}
      {showButtons && (
        <View style={styles.actionRow}>
          <PressableScale
            onPress={() => flyOut('left')}
            haptic="none"
            pressedScale={0.92}
            style={[styles.actionBtn, styles.actionSkip]}
          >
            <Ionicons name="close" size={28} color={semantic.danger} />
          </PressableScale>

          <PressableScale
            onPress={() => flyOut('right')}
            haptic="none"
            pressedScale={0.92}
            style={[styles.actionBtn, styles.actionLike]}
          >
            <Ionicons name="heart" size={26} color={semantic.success} />
          </PressableScale>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.lg,
  },
  cardSlot: {
    ...StyleSheet.absoluteFillObject,
    margin: space.md,
    marginTop: space.lg,
    marginBottom: 100, // reserva espaço pros action buttons
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelLeft: {
    position: 'absolute',
    top: 30,
    right: 30,
  },
  labelRight: {
    position: 'absolute',
    top: 30,
    left: 30,
  },
  labelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 2.5,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  labelText: {
    fontFamily: 'Inter_900Black',
    fontSize: 18,
    letterSpacing: 1.5,
  },
  actionRow: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
  },
  actionBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionSkip: {
    backgroundColor: surface.glass,
    borderColor: `${semantic.danger}55`,
    shadowColor: semantic.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  actionLike: {
    backgroundColor: surface.glass,
    borderColor: `${semantic.success}55`,
    shadowColor: semantic.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
  },
});

export default SwipeableStack;

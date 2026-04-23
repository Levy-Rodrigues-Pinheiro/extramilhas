/**
 * TiltCard3D — card 3D com perspective que inclina quando user arrasta
 * o dedo sobre ele.
 *
 * Isso é interação direta Apple-style: o dedo é o cursor/luz, o card
 * reage. Muito mais íntimo que gyroscope-driven porque o user SENTE o
 * cartão responder ao toque (tipo moving a physical photo slightly).
 *
 * Implementação:
 *  - PanGesture trackeia posição X/Y relativa ao card
 *  - rotateX (−8° a +8°) e rotateY (−8° a +8°) interpolados
 *  - perspective: 900 (típico iOS 3D effect)
 *  - Sheen: gradient highlight que segue o dedo (spotlight)
 *  - Shadow: cresce no lado oposto do tilt
 *  - Spring-back quando solta
 *
 * Uso:
 *   <TiltCard3D>
 *     <YourCardContent />
 *   </TiltCard3D>
 */

import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { motion } from '../../design/motion';
import { useReduceMotion } from '../../design/hooks';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Intensidade do tilt (graus máximos). Default 8°. */
  tiltIntensity?: number;
  /** Mostrar sheen highlight que segue o dedo */
  sheen?: boolean;
};

export function TiltCard3D({
  children,
  style,
  tiltIntensity = 8,
  sheen = true,
}: Props) {
  const reduceMotion = useReduceMotion();
  const [size, setSize] = React.useState({ w: 0, h: 0 });

  // Shared values: posição normalizada (-1 a +1)
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const active = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  const pan = React.useMemo(() => {
    return Gesture.Pan()
      .minDistance(0)
      .onBegin((e) => {
        if (reduceMotion) return;
        active.value = withSpring(1, { damping: 20, stiffness: 300 });
        // normalize: center = 0, edges = ±1
        if (size.w > 0 && size.h > 0) {
          x.value = (e.x / size.w - 0.5) * 2;
          y.value = (e.y / size.h - 0.5) * 2;
        }
      })
      .onUpdate((e) => {
        if (reduceMotion) return;
        if (size.w > 0 && size.h > 0) {
          x.value = Math.max(-1, Math.min(1, (e.x / size.w - 0.5) * 2));
          y.value = Math.max(-1, Math.min(1, (e.y / size.h - 0.5) * 2));
        }
      })
      .onFinalize(() => {
        if (reduceMotion) return;
        // Spring back to center
        x.value = withSpring(0, motion.springConfig.settled);
        y.value = withSpring(0, motion.springConfig.settled);
        active.value = withSpring(0, { damping: 24, stiffness: 280 });
      });
  }, [reduceMotion, size.w, size.h, active, x, y]);

  // Tilt style com perspective 3D
  const cardStyle = useAnimatedStyle(() => {
    const rotateY = x.value * tiltIntensity;
    const rotateX = -y.value * tiltIntensity;
    const scale = 1 + active.value * 0.02;

    return {
      transform: [
        { perspective: 900 },
        { rotateY: `${rotateY}deg` },
        { rotateX: `${rotateX}deg` },
        { scale },
      ],
    };
  });

  // Shadow que cresce no lado oposto do tilt (fisicamente correto)
  const shadowStyle = useAnimatedStyle(() => {
    const offsetX = -x.value * 14;
    const offsetY = -y.value * 14 + 8;
    return {
      shadowOffset: { width: offsetX, height: offsetY },
      shadowOpacity: 0.35 + active.value * 0.2,
      shadowRadius: 20 + active.value * 8,
    };
  });

  // Sheen (spotlight gradient seguindo o dedo)
  const sheenStyle = useAnimatedStyle(() => {
    // Centro do sheen = posição do dedo, ampliado
    const translateX = x.value * 60;
    const translateY = y.value * 60;
    return {
      opacity: active.value * 0.35,
      transform: [{ translateX }, { translateY }],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        onLayout={onLayout}
        style={[
          styles.shadowWrap,
          shadowStyle,
          style,
        ]}
      >
        <Animated.View style={[styles.card, cardStyle]}>
          {children}
          {sheen && (
            <Animated.View style={[StyleSheet.absoluteFill, sheenStyle]} pointerEvents="none">
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0)',
                  'rgba(255,255,255,0.18)',
                  'rgba(255,255,255,0)',
                ]}
                start={{ x: 0.2, y: 0.2 }}
                end={{ x: 0.8, y: 0.8 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          )}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 24,
  },
});

export default TiltCard3D;

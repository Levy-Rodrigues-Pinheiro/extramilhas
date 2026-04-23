/**
 * StaggerItem — wrapper pra items de lista com entrance animado em stagger.
 *
 * Ao montar, cada item faz:
 *   - translateY 16 → 0
 *   - opacity 0 → 1
 *   - delay = index * 40ms (cap at 8)
 *
 * Uso:
 *   <ScrollView>
 *     {items.map((item, i) => (
 *       <StaggerItem key={item.id} index={i}>
 *         <MyCard item={item} />
 *       </StaggerItem>
 *     ))}
 *   </ScrollView>
 *
 * Usa FadeInUp do reanimated.layout. Sob reduceMotion, cai pra opacity only.
 */

import React from 'react';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { motion } from '../../design/motion';
import { useReduceMotion } from '../../design/hooks';

type Props = {
  index: number;
  baseDelay?: number;
  children: React.ReactNode;
  /** Disable animation (ex: item adicionado via user action deveria aparecer instant) */
  disabled?: boolean;
};

export function StaggerItem({ index, baseDelay = 0, children, disabled }: Props) {
  const reduceMotion = useReduceMotion();
  const delay = disabled
    ? 0
    : baseDelay + motion.getStaggerDelay(index);

  if (disabled) {
    return <>{children}</>;
  }

  if (reduceMotion) {
    return (
      <Animated.View entering={FadeIn.delay(delay).duration(motion.timing.short)}>
        {children}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInUp
        .delay(delay)
        .duration(motion.timing.medium)
        .springify()
        .damping(22)
        .stiffness(200)}
    >
      {children}
    </Animated.View>
  );
}

export default StaggerItem;

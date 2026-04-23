/**
 * Design System primitives — barrel exports.
 *
 * Usage:
 *   import { AuroraBackground, GlassCard, AuroraButton } from 'src/components/primitives';
 */

export { AuroraBackground, default as AuroraBackgroundDefault } from './AuroraBackground';
export { GlassCard, default as GlassCardDefault } from './GlassCard';
export { PressableScale, default as PressableScaleDefault } from './PressableScale';
export { AnimatedNumber, default as AnimatedNumberDefault } from './AnimatedNumber';
export {
  ShimmerSkeleton,
  SkeletonCard,
  SkeletonListItem,
  default as ShimmerSkeletonDefault,
} from './ShimmerSkeleton';
export { StaggerItem, default as StaggerItemDefault } from './StaggerList';
export {
  ConfettiBurst,
  type ConfettiBurstHandle,
  default as ConfettiBurstDefault,
} from './ConfettiBurst';
export {
  EmptyStateIllustrated,
  default as EmptyStateIllustratedDefault,
} from './EmptyStateIllustrated';
export { AuroraButton, default as AuroraButtonDefault } from './AuroraButton';
export { FloatingTabBar, default as FloatingTabBarDefault } from './FloatingTabBar';
export { FloatingLabelInput, default as FloatingLabelInputDefault } from './FloatingLabelInput';

// Design tokens re-export
export {
  default as tokens,
  bg,
  aurora,
  premium,
  text,
  semantic,
  surface,
  fill,
  system,
  gradients,
  radius,
  space,
  type,
  shadow,
} from '../../design/tokens';
export { default as motion, timing, curve, timingConfig, springConfig } from '../../design/motion';
export { default as haptics } from '../../design/haptics';
export { useReduceMotion } from '../../design/hooks';

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

// Jobs-level innovative components
export { SymbolEffect, default as SymbolEffectDefault } from './SymbolEffect';
export { TiltCard3D, default as TiltCard3DDefault } from './TiltCard3D';
export { ScrollDrivenHeader, default as ScrollDrivenHeaderDefault } from './ScrollDrivenHeader';
export { ActivityRings, default as ActivityRingsDefault } from './ActivityRings';
export { LiveActivityBanner, default as LiveActivityBannerDefault } from './LiveActivityBanner';
export { ContextMenu, default as ContextMenuDefault, type ContextMenuItem } from './ContextMenu';
export { NumberPad, default as NumberPadDefault } from './NumberPad';
export { FlyingPlaneScene, default as FlyingPlaneSceneDefault } from './FlyingPlaneScene';
export { SegmentedControl, default as SegmentedControlDefault } from './SegmentedControl';
export { AnimatedCheckmark, default as AnimatedCheckmarkDefault } from './AnimatedCheckmark';
export {
  WrappedStoryStack,
  type WrappedStory,
  default as WrappedStoryStackDefault,
} from './WrappedStoryStack';
export { SwipeableStack, default as SwipeableStackDefault } from './SwipeableStack';
export {
  ComparisonBars,
  type ComparisonRow,
  default as ComparisonBarsDefault,
} from './ComparisonBars';
export {
  SettingsRow,
  SettingsGroup,
  default as SettingsRowDefault,
} from './SettingsRow';
export { RouteArc, default as RouteArcDefault } from './RouteArc';
export {
  FamilyAvatarStack,
  default as FamilyAvatarStackDefault,
} from './FamilyAvatarStack';

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

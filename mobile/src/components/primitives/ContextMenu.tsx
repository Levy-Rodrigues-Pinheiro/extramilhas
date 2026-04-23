/**
 * ContextMenu — long-press em card abre menu bouncy com cascade de ações.
 *
 * Apple-style (3D Touch → Haptic Touch replacement):
 *  1. Long-press dispara haptic medium + scale card down (0.96) + darken bg
 *  2. Menu surge do bottom com items stagger 40ms (spring bouncy)
 *  3. Cada item tem ícone + label + (opcional) destrutive color
 *  4. Tap fora ou item dismiss
 *  5. Items destrutivos têm separator e red tint
 *
 * Uso:
 *   <ContextMenu
 *     items={[
 *       { icon: 'create', label: 'Editar', onPress: () => {...} },
 *       { icon: 'trash', label: 'Excluir', onPress: () => {...}, destructive: true },
 *     ]}
 *   >
 *     <YourCard />
 *   </ContextMenu>
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  FadeIn,
  FadeOut,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  aurora,
  surface,
  semantic,
  text as textTokens,
  bg,
  space,
  radius,
} from '../../design/tokens';
import { motion } from '../../design/motion';
import { haptics } from '../../design/haptics';
import { useReduceMotion } from '../../design/hooks';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export type ContextMenuItem = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Separator ANTES deste item (agrupa visualmente) */
  separatorBefore?: boolean;
};

type Props = {
  items: ContextMenuItem[];
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Disable — usa children como-é, sem gesture */
  disabled?: boolean;
};

export function ContextMenu({ items, children, style, disabled }: Props) {
  const reduceMotion = useReduceMotion();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null,
  );
  const viewRef = React.useRef<View>(null);

  const pressScale = useSharedValue(1);

  const longPress = React.useMemo(() => {
    return Gesture.LongPress()
      .minDuration(450)
      .onStart(() => {
        if (disabled) return;
        runOnJS(haptics.medium)();
        pressScale.value = withSpring(0.96, { damping: 20, stiffness: 300 });
      })
      .onEnd((_e, success) => {
        if (!success || disabled) return;
        // Measure and open
        runOnJS(measureAndOpen)();
      })
      .onFinalize(() => {
        pressScale.value = withSpring(1, motion.springConfig.snappy);
      });
  }, [disabled, pressScale]);

  const measureAndOpen = () => {
    viewRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, w: width, h: height });
      setOpen(true);
    });
  };

  const close = () => {
    setOpen(false);
    setAnchor(null);
  };

  const handleItem = (item: ContextMenuItem) => {
    haptics.tap();
    close();
    // Execute after animation to avoid layout jump
    setTimeout(item.onPress, 120);
  };

  const childStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <>
      <GestureDetector gesture={longPress}>
        <Animated.View ref={viewRef as any} style={[childStyle, style]} collapsable={false}>
          {children}
        </Animated.View>
      </GestureDetector>

      {open && anchor && (
        <Modal
          visible
          transparent
          animationType="none"
          onRequestClose={close}
          statusBarTranslucent
        >
          <Pressable style={styles.backdrop} onPress={close}>
            <Animated.View
              style={StyleSheet.absoluteFill}
              entering={FadeIn.duration(motion.timing.short)}
              exiting={FadeOut.duration(motion.timing.short)}
            >
              <View style={styles.backdropTint} />
            </Animated.View>

            {/* Preview do card na posição original (tipo peek) */}
            <View
              style={[
                styles.preview,
                {
                  top: anchor.y,
                  left: anchor.x,
                  width: anchor.w,
                  height: anchor.h,
                },
              ]}
              pointerEvents="none"
            />

            {/* Menu */}
            <MenuPanel
              anchor={anchor}
              items={items}
              onItemPress={handleItem}
              reduceMotion={reduceMotion}
            />
          </Pressable>
        </Modal>
      )}
    </>
  );
}

// ─── MenuPanel ─────────────────────────────────────────────────────────

function MenuPanel({
  anchor,
  items,
  onItemPress,
  reduceMotion,
}: {
  anchor: { x: number; y: number; w: number; h: number };
  items: ContextMenuItem[];
  onItemPress: (item: ContextMenuItem) => void;
  reduceMotion: boolean;
}) {
  // Position menu below or above anchor
  const MENU_WIDTH = 260;
  const MENU_ITEM_HEIGHT = 46;
  const MENU_PADDING = 6;
  const menuHeight =
    items.length * MENU_ITEM_HEIGHT +
    items.filter((i) => i.separatorBefore).length +
    MENU_PADDING * 2;

  const belowAnchor = anchor.y + anchor.h + 8;
  const fitsBelow = belowAnchor + menuHeight < SCREEN_H - 60;
  const top = fitsBelow ? belowAnchor : anchor.y - menuHeight - 8;
  const left = Math.max(
    space.md,
    Math.min(
      SCREEN_W - MENU_WIDTH - space.md,
      anchor.x + anchor.w / 2 - MENU_WIDTH / 2,
    ),
  );

  return (
    <Animated.View
      entering={FadeIn.duration(motion.timing.short)}
      style={[
        styles.menu,
        {
          top,
          left,
          width: MENU_WIDTH,
        },
      ]}
    >
      <LinearGradient
        colors={['rgba(28, 28, 30, 0.97)', 'rgba(18, 20, 32, 0.97)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {items.map((item, i) => (
        <React.Fragment key={`${item.label}-${i}`}>
          {item.separatorBefore && <View style={styles.sep} />}
          <MenuRow item={item} index={i} onPress={onItemPress} reduceMotion={reduceMotion} />
        </React.Fragment>
      ))}
    </Animated.View>
  );
}

function MenuRow({
  item,
  index,
  onPress,
  reduceMotion,
}: {
  item: ContextMenuItem;
  index: number;
  onPress: (i: ContextMenuItem) => void;
  reduceMotion: boolean;
}) {
  const delay = reduceMotion ? 0 : index * 40 + 30;
  const translateY = useSharedValue(12);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 16, stiffness: 240 }),
    );
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
  }, [delay, translateY, opacity]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const color = item.destructive
    ? semantic.danger
    : item.disabled
    ? textTokens.muted
    : textTokens.primary;

  return (
    <Animated.View style={rowStyle}>
      <Pressable
        onPress={() => !item.disabled && onPress(item)}
        disabled={item.disabled}
        android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
        style={({ pressed }) => [
          styles.row,
          pressed && !item.disabled && { backgroundColor: 'rgba(255,255,255,0.06)' },
          item.disabled && { opacity: 0.4 },
        ]}
      >
        <Text style={[styles.rowLabel, { color }]}>{item.label}</Text>
        <Ionicons name={item.icon} size={18} color={color} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  backdropTint: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  preview: {
    position: 'absolute',
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: aurora.cyan,
    shadowColor: aurora.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  menu: {
    position: 'absolute',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.48,
    shadowRadius: 28,
    elevation: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  rowLabel: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    letterSpacing: -0.1,
  },
  sep: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 4,
  },
});

export default ContextMenu;

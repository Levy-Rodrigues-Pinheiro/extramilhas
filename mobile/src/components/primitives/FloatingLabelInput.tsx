/**
 * FloatingLabelInput — input com label que "flutua" pro topo ao focar/preencher.
 *
 * - Border transita pra aurora.cyan quando focused
 * - Label anima translateY + fontSize
 * - Suporta ícones left + right adornment
 * - Haptic 'select' no focus
 * - Glass bg com glow leve quando focado
 */

import React, { useEffect, useState, forwardRef } from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  Text,
  TextInputProps,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { aurora, text as textTokens, surface } from '../../design/tokens';
import { motion } from '../../design/motion';
import { haptics } from '../../design/haptics';
import { useReduceMotion } from '../../design/hooks';

const AnimatedText = Animated.createAnimatedComponent(Text);

type Props = TextInputProps & {
  label: string;
  iconLeft?: React.ComponentProps<typeof Ionicons>['name'];
  iconRight?: React.ComponentProps<typeof Ionicons>['name'];
  onRightIconPress?: () => void;
  errorText?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export const FloatingLabelInput = forwardRef<TextInput, Props>(function FloatingLabelInput(
  {
    label,
    iconLeft,
    iconRight,
    onRightIconPress,
    errorText,
    value,
    onFocus,
    onBlur,
    containerStyle,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const focusAnim = useSharedValue(0);
  const filledAnim = useSharedValue(value ? 1 : 0);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    focusAnim.value = withTiming(
      focused ? 1 : 0,
      reduceMotion ? motion.timingConfig.fast : motion.timingConfig.short,
    );
  }, [focused, focusAnim, reduceMotion]);

  useEffect(() => {
    filledAnim.value = withTiming(
      value ? 1 : 0,
      reduceMotion ? motion.timingConfig.fast : motion.timingConfig.short,
    );
  }, [value, filledAnim, reduceMotion]);

  const shouldFloat = focused || !!value;

  // Border color anima
  const containerStyleAnim = useAnimatedStyle(() => {
    const borderColor = errorText
      ? '#F87171'
      : (interpolateColor(
          focusAnim.value,
          [0, 1],
          [surface.glassBorder, aurora.cyan],
        ) as any);

    const shadowOpacity = focusAnim.value * 0.45;

    return {
      borderColor,
      shadowOpacity,
      shadowColor: aurora.cyan,
    };
  });

  // Label anima translateY + scale
  const labelStyle = useAnimatedStyle(() => {
    const float = Math.max(focusAnim.value, filledAnim.value);
    return {
      transform: [
        { translateY: interpolate(float, [0, 1], [0, -12]) },
        { scale: interpolate(float, [0, 1], [1, 0.82]) },
      ],
      color: interpolateColor(
        focusAnim.value,
        [0, 1],
        [textTokens.muted, aurora.cyan],
      ) as any,
    };
  });

  return (
    <View style={[{ marginBottom: 18 }, containerStyle]}>
      <Animated.View style={[styles.container, containerStyleAnim]}>
        {iconLeft && (
          <Ionicons
            name={iconLeft}
            size={18}
            color={focused ? aurora.cyan : textTokens.muted}
            style={styles.iconLeft}
          />
        )}

        <View style={styles.inputWrap}>
          <AnimatedText
            style={[
              styles.label,
              {
                left: iconLeft ? 32 : 0,
              },
              labelStyle,
            ]}
          >
            {label}
          </AnimatedText>

          <TextInput
            ref={ref}
            placeholderTextColor="transparent"
            value={value}
            onFocus={(e) => {
              setFocused(true);
              haptics.select();
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={[
              styles.input,
              { paddingLeft: iconLeft ? 32 : 0 },
              { paddingRight: iconRight ? 32 : 0 },
            ]}
            selectionColor={aurora.cyan}
            {...rest}
          />
        </View>

        {iconRight && (
          <Pressable
            onPress={onRightIconPress}
            style={styles.iconRightBtn}
            hitSlop={8}
          >
            <Ionicons
              name={iconRight}
              size={18}
              color={focused ? aurora.cyan : textTokens.muted}
            />
          </Pressable>
        )}
      </Animated.View>

      {errorText ? (
        <Animated.Text style={styles.error}>
          {errorText}
        </Animated.Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surface.glass,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    // elevation kept at 0 — glow só via shadow pra não mover layout
  },
  iconLeft: {
    position: 'absolute',
    left: 14,
    zIndex: 2,
  },
  inputWrap: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    left: 0,
    transform: [{ translateY: 0 }],
  },
  input: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: textTokens.primary,
    paddingTop: 10,
    paddingBottom: 2,
    height: 44,
    includeFontPadding: false,
  },
  iconRightBtn: {
    position: 'absolute',
    right: 10,
    padding: 4,
  },
  error: {
    marginTop: 6,
    color: '#F87171',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    paddingHorizontal: 4,
  },
});

export default FloatingLabelInput;

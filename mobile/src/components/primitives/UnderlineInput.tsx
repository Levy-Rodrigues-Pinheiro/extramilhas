/**
 * UnderlineInput — Aurora UI / Apple-style input minimalista.
 *
 * Diferencial sobre FloatingLabelInput:
 *  - Sem box glass — só underline que anima ao focar
 *  - Underline cyan com glow embaixo ao focar (estilo tape de aurora)
 *  - Label float estilo Material + Apple mix — começa maior, sobe ao focar
 *  - Espaço negativo grande ao redor — respira
 *  - Shake lateral programático via ref.shake() (erro)
 *  - Haptic 'select' no focus; 'error' no shake
 *
 * Uso:
 *   const ref = useRef<UnderlineInputHandle>(null);
 *   <UnderlineInput ref={ref} label="E-mail" icon="mail" />
 *   // em erro: ref.current?.shake();
 */

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
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
  withSequence,
  withSpring,
  interpolate,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { aurora, text as textTokens, surface, system } from '../../design/tokens';
import { motion } from '../../design/motion';
import { haptics } from '../../design/haptics';
import { useReduceMotion } from '../../design/hooks';

const AnimatedText = Animated.createAnimatedComponent(Text);

export type UnderlineInputHandle = {
  focus: () => void;
  blur: () => void;
  shake: () => void;
};

type Props = TextInputProps & {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconRight?: React.ComponentProps<typeof Ionicons>['name'];
  onRightIconPress?: () => void;
  errorText?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export const UnderlineInput = forwardRef<UnderlineInputHandle, Props>(
  function UnderlineInput(
    {
      label,
      icon,
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
    const inputRef = useRef<TextInput>(null);
    const [focused, setFocused] = useState(false);
    const focusAnim = useSharedValue(0);
    const filledAnim = useSharedValue(value ? 1 : 0);
    const shakeX = useSharedValue(0);
    const reduceMotion = useReduceMotion();

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      shake: () => {
        haptics.error();
        if (reduceMotion) return;
        shakeX.value = withSequence(
          withTiming(-10, { duration: 70, easing: Easing.out(Easing.quad) }),
          withTiming(10, { duration: 70, easing: Easing.inOut(Easing.quad) }),
          withTiming(-7, { duration: 65, easing: Easing.inOut(Easing.quad) }),
          withTiming(7, { duration: 65, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 60, easing: Easing.out(Easing.quad) }),
        );
      },
    }));

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

    // Label float
    const labelStyle = useAnimatedStyle(() => {
      const float = Math.max(focusAnim.value, filledAnim.value);
      return {
        transform: [
          { translateY: interpolate(float, [0, 1], [0, -22]) },
          { scale: interpolate(float, [0, 1], [1, 0.78]) },
        ],
        color: errorText
          ? system.red
          : (interpolateColor(
              focusAnim.value,
              [0, 1],
              [textTokens.tertiary, aurora.cyan],
            ) as any),
      };
    });

    // Underline width + color
    const underlineStyle = useAnimatedStyle(() => {
      return {
        transform: [
          { scaleX: interpolate(focusAnim.value, [0, 1], [0.3, 1]) },
        ],
        backgroundColor: errorText
          ? system.red
          : (interpolateColor(
              focusAnim.value,
              [0, 1],
              [surface.glassBorder, aurora.cyan],
            ) as any),
      };
    });

    // Glow underneath (cyan tape)
    const glowStyle = useAnimatedStyle(() => {
      return {
        opacity: errorText ? 0.4 : focusAnim.value * 0.55,
        shadowOpacity: errorText ? 0.5 : focusAnim.value * 0.7,
        shadowColor: errorText ? system.red : aurora.cyan,
      };
    });

    // Shake container
    const shakeStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: shakeX.value }],
    }));

    return (
      <Animated.View style={[{ marginBottom: 18 }, shakeStyle, containerStyle]}>
        <View style={styles.row}>
          {icon && (
            <Ionicons
              name={icon}
              size={20}
              color={errorText ? system.red : focused ? aurora.cyan : textTokens.tertiary}
              style={styles.iconLeft}
            />
          )}

          <View style={[styles.inputWrap, { paddingLeft: icon ? 34 : 0 }]}>
            <AnimatedText style={[styles.label, labelStyle]}>
              {label}
            </AnimatedText>

            <TextInput
              ref={inputRef}
              value={value}
              placeholderTextColor="transparent"
              onFocus={(e) => {
                setFocused(true);
                haptics.select();
                onFocus?.(e);
              }}
              onBlur={(e) => {
                setFocused(false);
                onBlur?.(e);
              }}
              style={[styles.input]}
              selectionColor={aurora.cyan}
              {...rest}
            />
          </View>

          {iconRight && (
            <Pressable
              onPress={onRightIconPress}
              style={styles.iconRightBtn}
              hitSlop={10}
            >
              <Ionicons
                name={iconRight}
                size={20}
                color={focused ? aurora.cyan : textTokens.tertiary}
              />
            </Pressable>
          )}
        </View>

        {/* Underline + glow */}
        <View style={styles.underlineTrack}>
          <Animated.View style={[styles.underline, underlineStyle]} />
          <Animated.View
            pointerEvents="none"
            style={[styles.underlineGlow, glowStyle]}
          />
        </View>

        {errorText ? (
          <Animated.Text style={styles.error}>{errorText}</Animated.Text>
        ) : null}
      </Animated.View>
    );
  },
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 22,
    paddingBottom: 10,
  },
  iconLeft: {
    position: 'absolute',
    left: 0,
    top: 26,
  },
  inputWrap: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 32,
  },
  label: {
    position: 'absolute',
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    letterSpacing: -0.1,
    left: 0,
  },
  input: {
    fontFamily: 'Inter_500Medium',
    fontSize: 17,
    color: textTokens.primary,
    paddingTop: 0,
    paddingBottom: 0,
    includeFontPadding: false,
    letterSpacing: -0.2,
  },
  iconRightBtn: {
    position: 'absolute',
    right: 0,
    padding: 6,
    top: 20,
  },
  underlineTrack: {
    height: 1.5,
    position: 'relative',
  },
  underline: {
    height: 1.5,
    width: '100%',
    borderRadius: 1,
    transformOrigin: 'left',
  },
  underlineGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -1,
    height: 14,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    shadowColor: aurora.cyan,
  },
  error: {
    marginTop: 6,
    color: system.red,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    paddingHorizontal: 2,
  },
});

export default UnderlineInput;

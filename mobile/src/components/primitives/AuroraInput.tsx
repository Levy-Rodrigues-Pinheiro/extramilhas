/**
 * AuroraInput — port fiel do Input do Aurora UI login-page.tsx.
 *
 * CSS referência:
 *   label (acima): 0.85rem weight 500 color var(--text-dim)
 *   container: padding 0 14px, bg var(--surface), border 1px var(--border)
 *     radius 14, transition all 0.3s ease-apple
 *   focus: border var(--accent), boxShadow 0 0 0 4px var(--glow)
 *   icon: prefixo à esquerda
 *   suffix: adorno à direita (ex: eye toggle)
 *   input: flex 1, bg transparent, padding 14px 0, font 0.95rem
 *
 * Diferenças do FloatingLabelInput existente:
 *  - Label fica ACIMA do input (não float dentro) — estilo Aurora UI
 *  - Focus = ring glow ao redor (não só border)
 *  - Placeholder aparente (não transparente)
 *  - Border radius 14 (vs 14 antes) — Aurora UI exato
 *  - Cor do texto primary sólido
 */

import React, {
  forwardRef,
  useState,
} from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  Text,
  TextInputProps,
  StyleProp,
  ViewStyle,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  aurora,
  text as textTokens,
  surface,
  system,
} from '../../design/tokens';
import { haptics } from '../../design/haptics';
import { useReduceMotion } from '../../design/hooks';

type Props = TextInputProps & {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Adorno à direita — tipicamente botão eye para password toggle */
  suffix?: React.ReactNode;
  errorText?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export const AuroraInput = forwardRef<TextInput, Props>(function AuroraInput(
  {
    label,
    icon,
    suffix,
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
  const reduceMotion = useReduceMotion();

  React.useEffect(() => {
    focusAnim.value = withTiming(focused ? 1 : 0, {
      duration: reduceMotion ? 0 : 260,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // ease-apple
    });
  }, [focused, focusAnim, reduceMotion]);

  // Anima bg, border e shadow (ring glow) — Aurora UI: focus = box-shadow 0 0 0 4px var(--glow)
  const animatedContainer = useAnimatedStyle(() => ({
    borderColor: errorText
      ? system.red
      : (interpolateColor(
          focusAnim.value,
          [0, 1],
          [surface.glassBorderActive, aurora.cyan],
        ) as any),
    shadowOpacity: focusAnim.value * 0.55,
    shadowColor: errorText ? system.red : aurora.cyan,
  }));

  return (
    <View style={[styles.root, containerStyle]}>
      {/* Label acima */}
      <Text style={styles.label}>{label}</Text>

      {/* Container com icon + input + suffix */}
      <Animated.View style={[styles.field, animatedContainer]}>
        {icon && (
          <Ionicons
            name={icon}
            size={16}
            color={focused ? aurora.cyan : textTokens.tertiary}
            style={styles.icon}
          />
        )}

        <TextInput
          ref={ref}
          value={value}
          placeholderTextColor={textTokens.tertiary}
          onFocus={(e) => {
            setFocused(true);
            haptics.select();
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={styles.input}
          selectionColor={aurora.cyan}
          {...rest}
        />

        {suffix ? <View style={styles.suffix}>{suffix}</View> : null}
      </Animated.View>

      {errorText ? (
        <Text style={styles.error}>{errorText}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    // vertical gap controlled by parent via `gap` ou marginBottom
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: textTokens.secondary,
    marginBottom: 6,
    letterSpacing: -0.05,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 48,
    // Ring glow shadow (Aurora UI focus ring)
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    // elevation 0 — shadow only, nao queremos offset Z
  },
  icon: {
    marginRight: 2,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: textTokens.primary,
    letterSpacing: -0.1,
    includeFontPadding: false,
  },
  suffix: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    marginTop: 6,
    color: system.red,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    paddingHorizontal: 2,
  },
});

export default AuroraInput;

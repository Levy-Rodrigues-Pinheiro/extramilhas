/**
 * OTPInput — campo de 6 dígitos para 2FA/OTP (port do template Aurora UI).
 *
 * Features:
 *  - 6 boxes de 1 dígito com TextInput separado
 *  - Auto-advance: ao digitar, foca o próximo
 *  - Backspace: se vazio, foca anterior e apaga
 *  - Paste: onChangeText recebendo >1 char distribui pelos boxes
 *  - Border cyan + shadow ring quando preenchido
 *  - Shake horizontal + haptic error em código inválido
 *  - Auto-submit via onComplete quando todos preenchidos
 *
 * Uso:
 *   const ref = useRef<OTPInputHandle>(null);
 *   <OTPInput
 *     ref={ref}
 *     onComplete={(code) => verify(code)}
 *   />
 *   // em erro: ref.current?.shakeAndClear()
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
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  aurora,
  text as textTokens,
  surface,
  system,
} from '../../design/tokens';
import { haptics } from '../../design/haptics';
import { useReduceMotion } from '../../design/hooks';

const DIGITS = 6;

export type OTPInputHandle = {
  focus: () => void;
  clear: () => void;
  shakeAndClear: () => void;
};

type Props = {
  /** Chamado quando todos os 6 dígitos estão preenchidos */
  onComplete?: (code: string) => void;
  /** Chamado em cada mudança (útil pra enable/disable submit) */
  onChange?: (code: string) => void;
  /** Desabilita inputs (ex: durante verificação) */
  disabled?: boolean;
  /** Estilo do container (row) */
  style?: any;
};

export const OTPInput = forwardRef<OTPInputHandle, Props>(function OTPInput(
  { onComplete, onChange, disabled, style },
  ref,
) {
  const [digits, setDigits] = useState<string[]>(Array(DIGITS).fill(''));
  const inputs = useRef<Array<TextInput | null>>([]);
  const shakeX = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  useImperativeHandle(ref, () => ({
    focus: () => inputs.current[0]?.focus(),
    clear: () => {
      setDigits(Array(DIGITS).fill(''));
      inputs.current[0]?.focus();
    },
    shakeAndClear: () => {
      haptics.error();
      if (!reduceMotion) {
        shakeX.value = withSequence(
          withTiming(-10, { duration: 60, easing: Easing.out(Easing.quad) }),
          withTiming(10, { duration: 60, easing: Easing.inOut(Easing.quad) }),
          withTiming(-7, { duration: 55, easing: Easing.inOut(Easing.quad) }),
          withTiming(5, { duration: 55, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 50, easing: Easing.out(Easing.quad) }),
        );
      }
      // limpa e foca o primeiro após um pouco
      setTimeout(() => {
        setDigits(Array(DIGITS).fill(''));
        inputs.current[0]?.focus();
      }, 250);
    },
  }));

  useEffect(() => {
    const code = digits.join('');
    onChange?.(code);
    if (digits.every((d) => d !== '') && !disabled) {
      onComplete?.(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const handleChange = (i: number, raw: string) => {
    // Pasted content: distribuir pelos boxes
    if (raw.length > 1) {
      const cleaned = raw.replace(/\D/g, '').slice(0, DIGITS);
      if (!cleaned) return;
      const next = Array(DIGITS).fill('');
      for (let k = 0; k < cleaned.length; k++) {
        next[k] = cleaned[k];
      }
      setDigits(next);
      const focusIdx = Math.min(cleaned.length, DIGITS - 1);
      inputs.current[focusIdx]?.focus();
      return;
    }
    // Single digit
    if (!/^\d?$/.test(raw)) return;
    const next = [...digits];
    next[i] = raw;
    setDigits(next);
    if (raw && i < DIGITS - 1) {
      inputs.current[i + 1]?.focus();
    }
  };

  const handleKeyPress = (
    i: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    const key = e.nativeEvent.key;
    if (key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
      const next = [...digits];
      next[i - 1] = '';
      setDigits(next);
    }
  };

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  return (
    <Animated.View style={[styles.row, shakeStyle, style]}>
      {digits.map((d, i) => (
        <DigitBox
          key={i}
          value={d}
          disabled={disabled}
          inputRef={(el) => {
            inputs.current[i] = el;
          }}
          onChangeText={(t) => handleChange(i, t)}
          onKeyPress={(e) => handleKeyPress(i, e)}
        />
      ))}
    </Animated.View>
  );
});

// ─── Digit Box individual (border + glow focus) ────────────────────────

function DigitBox({
  value,
  inputRef,
  onChangeText,
  onKeyPress,
  disabled,
}: {
  value: string;
  inputRef: (el: TextInput | null) => void;
  onChangeText: (t: string) => void;
  onKeyPress: (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const filled = !!value;

  return (
    <View
      style={[
        styles.box,
        {
          borderColor: filled || focused ? aurora.cyan : surface.glassBorderActive,
          shadowOpacity: filled || focused ? 0.5 : 0,
        },
      ]}
    >
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onKeyPress={onKeyPress}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        maxLength={Platform.OS === 'ios' ? 6 : 1} // iOS permite paste; android clamp
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        editable={!disabled}
        selectionColor={aurora.cyan}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  box: {
    width: 44,
    height: 54,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: surface.glass,
    shadowColor: aurora.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 22,
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'Menlo',
    }),
    fontWeight: '600',
    color: textTokens.primary,
    includeFontPadding: false,
  },
});

export default OTPInput;

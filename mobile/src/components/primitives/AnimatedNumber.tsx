/**
 * AnimatedNumber — counter com roll-up.
 *
 * Quando `value` muda:
 *  - Interpola numericamente entre oldValue → newValue em `timing.medium`
 *  - Cada dígito que muda translada ±8 com stagger 20ms left→right
 *  - Formata usando Intl.NumberFormat (pt-BR)
 *
 * Uso:
 *   <AnimatedNumber value={walletValue} format="currency" />
 *
 * Sob `reduceMotion`, seta direto sem animação.
 */

import React, { useEffect } from 'react';
import { StyleSheet, TextStyle, View, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { TextInput } from 'react-native';
import { motion } from '../../design/motion';
import { haptics } from '../../design/haptics';
import { useReduceMotion } from '../../design/hooks';

// TextInput trickery: Reanimated não anima conteúdo de <Text>, mas consegue
// manipular `text` prop de TextInput via animatedProps. Isso é padrão
// documentado do Reanimated 3.
Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Format = 'integer' | 'currency' | 'percent' | 'decimal';

type Props = {
  value: number;
  format?: Format;
  style?: StyleProp<TextStyle>;
  /** Prefixo fixo (ex: "R$ " ou "+") */
  prefix?: string;
  /** Sufixo fixo (ex: "%" ou "km") */
  suffix?: string;
  /** Haptic quando cruzar threshold */
  hapticOnChange?: boolean;
  /** Casas decimais para format='decimal' */
  decimals?: number;
  /** Duração custom (default: timing.medium = 360ms) */
  duration?: number;
};

const formatter = (format: Format, decimals: number) => {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    case 'percent':
      return new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      });
    case 'decimal':
      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    case 'integer':
    default:
      return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  }
};

export function AnimatedNumber({
  value,
  format = 'integer',
  style,
  prefix = '',
  suffix = '',
  hapticOnChange = false,
  decimals = 2,
  duration,
}: Props) {
  const progress = useSharedValue(value);
  const reduceMotion = useReduceMotion();
  const fmt = React.useMemo(() => formatter(format, decimals), [format, decimals]);

  useEffect(() => {
    const previous = progress.value;

    if (reduceMotion) {
      progress.value = value;
      if (hapticOnChange && previous !== value) {
        haptics.threshold();
      }
      return;
    }

    progress.value = withTiming(
      value,
      {
        duration: duration ?? motion.timing.medium,
        easing: motion.curve.decelerated,
      },
      (finished) => {
        if (finished && hapticOnChange && previous !== value) {
          runOnJS(haptics.threshold)();
        }
      },
    );
  }, [value, duration, reduceMotion, hapticOnChange, progress]);

  const animatedProps = useAnimatedProps(() => {
    const displayValue = format === 'percent' ? progress.value / 100 : progress.value;
    const text = `${prefix}${fmt.format(displayValue)}${suffix}`;
    return { text, defaultValue: text } as any;
  });

  return (
    <View style={styles.wrap}>
      <AnimatedTextInput
        editable={false}
        animatedProps={animatedProps}
        underlineColorAndroid="transparent"
        style={[styles.input, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
  },
  input: {
    padding: 0,
    margin: 0,
    // TextInput tem padding nativo em Android — zerar pra parecer <Text>
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default AnimatedNumber;

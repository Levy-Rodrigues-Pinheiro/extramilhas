/**
 * NumberPad — teclado numérico bespoke estilo Apple Wallet / Calculator.
 *
 * 3x4 grid com:
 *  - 0-9 + backspace + "done"
 *  - Cada tecla: PressableScale + haptic 'tap' (cada tecla!)
 *  - Display com AnimatedNumber (digit-by-digit rolling)
 *  - Labels sutis abaixo dos números (igual phone dialpad)
 *  - Max length configurável (pra limitar entrada)
 *
 * Isso substitui o keyboard nativo (que é chato em forms de R$).
 * Usuário sente o feeling de Apple Pay/Wallet ao digitar valor.
 *
 * Uso:
 *   <NumberPad
 *     value={value}
 *     onChange={setValue}
 *     maxLength={9}
 *     format="currency"
 *   />
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import { AnimatedNumber } from './AnimatedNumber';
import {
  aurora,
  surface,
  text as textTokens,
  space,
  semantic,
} from '../../design/tokens';
import { motion } from '../../design/motion';
import { haptics } from '../../design/haptics';

type Format = 'integer' | 'currency' | 'miles';

type Props = {
  value: string;
  onChange: (v: string) => void;
  /** Max de dígitos (default 9) */
  maxLength?: number;
  /** Formato do display topo */
  format?: Format;
  /** Label acima do display */
  label?: string;
  /** Callback quando "Done" pressionado */
  onDone?: () => void;
  /** Label do botão "Done" */
  doneLabel?: string;
};

const KEYS: Array<{ key: string; sub?: string; action?: 'backspace' | 'done' }> = [
  { key: '1' },
  { key: '2', sub: 'ABC' },
  { key: '3', sub: 'DEF' },
  { key: '4', sub: 'GHI' },
  { key: '5', sub: 'JKL' },
  { key: '6', sub: 'MNO' },
  { key: '7', sub: 'PQRS' },
  { key: '8', sub: 'TUV' },
  { key: '9', sub: 'WXYZ' },
  { key: '.', sub: '' },
  { key: '0' },
  { key: '⌫', action: 'backspace' },
];

export function NumberPad({
  value,
  onChange,
  maxLength = 9,
  format = 'integer',
  label,
  onDone,
  doneLabel = 'OK',
}: Props) {
  const handleKey = (k: typeof KEYS[0]) => {
    haptics.tap();
    if (k.action === 'backspace') {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length >= maxLength) {
      haptics.warning();
      return;
    }
    if (k.key === '.' && value.includes('.')) return; // no duplicate decimal
    onChange(value + k.key);
  };

  const displayValue = parseFloat(value || '0');

  return (
    <View style={styles.wrap}>
      {/* Display */}
      <View style={styles.displayBox}>
        {label && <Text style={styles.displayLabel}>{label}</Text>}
        <View style={styles.displayValueRow}>
          {format === 'currency' && <Text style={styles.currencyR}>R$</Text>}
          <AnimatedNumber
            value={displayValue}
            format={format === 'currency' ? 'integer' : 'integer'}
            style={styles.displayValue}
            duration={motion.timing.short}
          />
          {format === 'miles' && <Text style={styles.unit}>mi</Text>}
        </View>
        <View style={styles.displayUnderline} />
      </View>

      {/* Grid 3x4 */}
      <View style={styles.grid}>
        {KEYS.map((k, i) => (
          <NumPadKey
            key={i}
            k={k}
            onPress={() => handleKey(k)}
            disabled={k.key === '.' && value.includes('.')}
          />
        ))}
      </View>

      {/* Done button */}
      {onDone && (
        <PressableScale
          onPress={() => {
            haptics.medium();
            onDone();
          }}
          haptic="none"
          style={styles.doneBtn}
        >
          <Text style={styles.doneText}>{doneLabel}</Text>
        </PressableScale>
      )}
    </View>
  );
}

function NumPadKey({
  k,
  onPress,
  disabled,
}: {
  k: typeof KEYS[0];
  onPress: () => void;
  disabled?: boolean;
}) {
  const isBackspace = k.action === 'backspace';

  return (
    <PressableScale
      onPress={onPress}
      haptic="none"
      pressedScale={0.88}
      disabled={disabled}
      style={styles.keyWrap}
    >
      <View style={[styles.key, isBackspace && styles.keyBackspace]}>
        {isBackspace ? (
          <Ionicons name="backspace-outline" size={22} color={semantic.danger} />
        ) : (
          <>
            <Text style={styles.keyMain}>{k.key}</Text>
            {k.sub && k.sub.length > 0 && (
              <Text style={styles.keySub}>{k.sub}</Text>
            )}
          </>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: space.md,
    gap: space.lg,
  },
  displayBox: {
    alignItems: 'center',
    paddingVertical: space.md,
  },
  displayLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  displayValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  currencyR: {
    color: textTokens.secondary,
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
  },
  displayValue: {
    color: textTokens.primary,
    fontFamily: 'Inter_900Black',
    fontSize: 48,
    letterSpacing: -1.4,
  },
  unit: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  displayUnderline: {
    width: 40,
    height: 2,
    marginTop: 6,
    backgroundColor: aurora.cyan,
    borderRadius: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  keyWrap: {
    width: '31.5%',
  },
  key: {
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyBackspace: {
    backgroundColor: 'rgba(255,69,58,0.08)',
    borderColor: 'rgba(255,69,58,0.22)',
  },
  keyMain: {
    color: textTokens.primary,
    fontFamily: 'Inter_400Regular',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  keySub: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 1.4,
    marginTop: -4,
  },
  doneBtn: {
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: aurora.cyan,
    alignItems: 'center',
    shadowColor: aurora.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  doneText: {
    color: '#041220',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});

export default NumberPad;

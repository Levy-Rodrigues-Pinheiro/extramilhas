/**
 * ComparisonBars — side-by-side horizontal bars estilo Apple iPhone Compare.
 *
 * Para cada spec, mostra 2 barras proporcionais (A e B) com labels e valores.
 * Animação: bars preenchem da esquerda pra direita ao montar (stagger).
 *
 * Uso:
 *   <ComparisonBars
 *     labelA="Card A"
 *     labelB="Card B"
 *     rows={[
 *       { label: 'Anuidade', a: 500, b: 800, format: 'currency', betterIs: 'lower' },
 *       { label: 'Pontos/R$', a: 1.5, b: 2.2, format: 'decimal' },
 *     ]}
 *   />
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  aurora,
  semantic,
  surface,
  text as textTokens,
  gradients,
  space,
} from '../../design/tokens';
import { motion } from '../../design/motion';
import { useReduceMotion } from '../../design/hooks';

type ValueFormat = 'currency' | 'integer' | 'decimal' | 'percent';

export type ComparisonRow = {
  label: string;
  a: number;
  b: number;
  format?: ValueFormat;
  /** Pra destacar qual é melhor: 'higher' (maior = melhor) ou 'lower' */
  betterIs?: 'higher' | 'lower' | 'neutral';
  /** Suffix adicional */
  unit?: string;
};

type Props = {
  labelA: string;
  labelB: string;
  rows: ComparisonRow[];
};

const formatValue = (v: number, format: ValueFormat = 'integer'): string => {
  switch (format) {
    case 'currency':
      return `R$ ${v.toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
    case 'decimal':
      return v.toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      });
    case 'percent':
      return `${v.toFixed(1)}%`;
    case 'integer':
    default:
      return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }
};

const isABetter = (row: ComparisonRow): 'a' | 'b' | 'tie' => {
  if (row.a === row.b) return 'tie';
  if (row.betterIs === 'lower') return row.a < row.b ? 'a' : 'b';
  if (row.betterIs === 'higher') return row.a > row.b ? 'a' : 'b';
  return 'tie';
};

export function ComparisonBars({ labelA, labelB, rows }: Props) {
  return (
    <View style={styles.root}>
      {/* Header labels */}
      <View style={styles.headerRow}>
        <View style={[styles.headerLabel, styles.headerLabelA]}>
          <View style={[styles.colorDot, { backgroundColor: aurora.cyan }]} />
          <Text style={styles.headerText}>{labelA}</Text>
        </View>
        <View style={[styles.headerLabel, styles.headerLabelB]}>
          <Text style={styles.headerText}>{labelB}</Text>
          <View style={[styles.colorDot, { backgroundColor: aurora.magenta }]} />
        </View>
      </View>

      {rows.map((row, i) => (
        <Row key={row.label} row={row} index={i} />
      ))}
    </View>
  );
}

function Row({ row, index }: { row: ComparisonRow; index: number }) {
  const reduceMotion = useReduceMotion();
  const progressA = useSharedValue(0);
  const progressB = useSharedValue(0);
  const winner = isABetter(row);

  useEffect(() => {
    const delay = index * 80 + 60;
    const duration = reduceMotion ? 200 : 700;
    progressA.value = withDelay(
      delay,
      withTiming(1, { duration, easing: motion.curve.decelerated }),
    );
    progressB.value = withDelay(
      delay + 40,
      withTiming(1, { duration, easing: motion.curve.decelerated }),
    );
  }, [index, progressA, progressB, reduceMotion]);

  // Determinar largura máxima entre A e B (100%)
  const max = Math.max(row.a, row.b, 0.0001);
  const relA = row.a / max;
  const relB = row.b / max;

  const styleA = useAnimatedStyle(() => ({
    width: `${Math.max(2, progressA.value * relA * 100)}%`,
  }));

  const styleB = useAnimatedStyle(() => ({
    width: `${Math.max(2, progressB.value * relB * 100)}%`,
  }));

  const valStr = row.unit
    ? (v: number) => `${formatValue(v, row.format)} ${row.unit}`
    : (v: number) => formatValue(v, row.format);

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{row.label}</Text>

      {/* A bar */}
      <View style={styles.barRow}>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, styleA]}>
            <LinearGradient
              colors={[`${aurora.cyan}AA`, aurora.cyan]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <View style={styles.valCol}>
          <Text
            style={[
              styles.barValue,
              { color: aurora.cyan },
              winner === 'a' && styles.barValueWinner,
            ]}
          >
            {valStr(row.a)}
          </Text>
          {winner === 'a' && (
            <Ionicons name="trophy" size={10} color={aurora.cyan} />
          )}
        </View>
      </View>

      {/* B bar */}
      <View style={styles.barRow}>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, styleB]}>
            <LinearGradient
              colors={[`${aurora.magenta}AA`, aurora.magenta]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <View style={styles.valCol}>
          <Text
            style={[
              styles.barValue,
              { color: aurora.magenta },
              winner === 'b' && styles.barValueWinner,
            ]}
          >
            {valStr(row.b)}
          </Text>
          {winner === 'b' && (
            <Ionicons name="trophy" size={10} color={aurora.magenta} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  headerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerLabelA: {},
  headerLabelB: {},
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerText: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: -0.1,
  },
  row: {
    gap: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: surface.separator,
  },
  rowLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barTrack: {
    flex: 1,
    height: 14,
    borderRadius: 7,
    backgroundColor: surface.glass,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 7,
    minWidth: 14,
    overflow: 'hidden',
  },
  valCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 70,
    justifyContent: 'flex-end',
  },
  barValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: -0.2,
  },
  barValueWinner: {
    fontFamily: 'Inter_900Black',
  },
});

export default ComparisonBars;

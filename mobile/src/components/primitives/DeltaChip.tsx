/**
 * DeltaChip — pequeno chip Apple Stocks-style mostrando variação ↑/↓ + %.
 *
 * Variantes:
 *  - positive: bg verde 14% alpha, texto verde, seta cima
 *  - negative: bg vermelho 14% alpha, texto vermelho, seta baixo
 *  - neutral:  bg cinza 8% alpha, texto secondary, traço horizontal
 *
 * Uso:
 *   <DeltaChip value={18.5} format="percent" />     ↑ 18.5%
 *   <DeltaChip value={-2.3} format="percent" />     ↓ 2.3%
 *   <DeltaChip value={1240} format="currency" />    ↑ R$ 1.240
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { semantic, surface, text as textTokens } from '../../design/tokens';

type Format = 'percent' | 'currency' | 'number' | 'plain';

type Props = {
  value: number;
  /** Como formatar o valor */
  format?: Format;
  /** Override label completo (ignora value/format) */
  label?: string;
  /** Esconde a seta (default mostra) */
  hideArrow?: boolean;
  /** Tamanho */
  size?: 'sm' | 'md';
};

export function DeltaChip({
  value,
  format = 'percent',
  label,
  hideArrow,
  size = 'md',
}: Props) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  const color = isPositive
    ? semantic.success
    : isNegative
      ? semantic.danger
      : textTokens.secondary;

  const bg = isPositive
    ? semantic.successBg
    : isNegative
      ? semantic.dangerBg
      : 'rgba(255,255,255,0.06)';

  const arrowName: React.ComponentProps<typeof Ionicons>['name'] = isPositive
    ? 'arrow-up'
    : isNegative
      ? 'arrow-down'
      : 'remove';

  const text = label ?? formatValue(Math.abs(value), format);

  const sizeStyle = size === 'sm' ? styles.sm : styles.md;
  const fontSize = size === 'sm' ? 11 : 13;
  const iconSize = size === 'sm' ? 10 : 12;

  return (
    <View style={[styles.chip, sizeStyle, { backgroundColor: bg }]}>
      {!hideArrow && (
        <Ionicons name={arrowName} size={iconSize} color={color} />
      )}
      <Text style={[styles.text, { color, fontSize }]}>{text}</Text>
    </View>
  );
}

function formatValue(absValue: number, format: Format): string {
  switch (format) {
    case 'percent':
      return `${absValue.toFixed(absValue >= 10 ? 0 : 1)}%`;
    case 'currency':
      return `R$ ${absValue.toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}`;
    case 'number':
      return absValue.toLocaleString('pt-BR');
    case 'plain':
    default:
      return String(absValue);
  }
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 100,
  },
  sm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  text: {
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.1,
    includeFontPadding: false,
  },
});

export default DeltaChip;

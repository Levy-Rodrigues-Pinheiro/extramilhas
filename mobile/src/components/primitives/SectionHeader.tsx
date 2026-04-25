/**
 * SectionHeader — header de seção iOS-style.
 *
 * Anatomia Apple:
 *  - Title em peso forte (17pt semibold) ou bold (24pt para dramático)
 *  - Optional eyebrow uppercase pequena
 *  - Optional "Ver todos →" alinhado à direita (link em cor accent)
 *  - Padding vertical generoso (12-20px)
 *
 * Tamanhos:
 *  - 'compact' (default) → 17pt — usar dentro de listas/seções inline
 *  - 'large' → 24pt — usar em destaques/grupos principais
 *
 * Uso:
 *   <SectionHeader title="Oportunidades" actionLabel="Ver todas" onAction={...} />
 *   <SectionHeader eyebrow="HOJE" title="Suas missões" size="large" />
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aurora, text as textTokens } from '../../design/tokens';
import { PressableScale } from './PressableScale';

type Props = {
  /** Título principal */
  title: string;
  /** Eyebrow (small caps acima do título) */
  eyebrow?: string;
  /** Subtítulo (linha sutil abaixo) */
  subtitle?: string;
  /** Label do link de ação (ex: "Ver todos") */
  actionLabel?: string;
  /** Handler do link */
  onAction?: () => void;
  /** Tamanho */
  size?: 'compact' | 'large';
  /** Espaço top extra (default 0) */
  marginTop?: number;
};

export function SectionHeader({
  title,
  eyebrow,
  subtitle,
  actionLabel,
  onAction,
  size = 'compact',
  marginTop = 0,
}: Props) {
  const titleStyle = size === 'large' ? styles.titleLarge : styles.titleCompact;

  return (
    <View style={[styles.row, { marginTop }]}>
      <View style={styles.left}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={titleStyle}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {actionLabel && onAction ? (
        <PressableScale
          onPress={onAction}
          haptic="tap"
          pressedScale={0.96}
          style={styles.actionBtn}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={aurora.cyan} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 10,
  },
  left: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: textTokens.tertiary,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  titleCompact: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  titleLarge: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  subtitle: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
    letterSpacing: -0.05,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 4,
    paddingLeft: 8,
  },
  actionText: {
    color: aurora.cyan,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    letterSpacing: -0.1,
  },
});

export default SectionHeader;

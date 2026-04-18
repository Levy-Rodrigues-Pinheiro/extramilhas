import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/theme';
import type { Classification } from '../types';

const CONFIG: Record<
  Classification,
  { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; text: string; border: string }
> = {
  IMPERDIVEL: {
    label: 'Imperdível',
    icon: 'flame',
    bg: Colors.green.bg,
    text: Colors.green.primary,
    border: Colors.green.border,
  },
  BOA: {
    label: 'Boa',
    icon: 'thumbs-up',
    bg: Colors.yellow.bg,
    text: Colors.yellow.primary,
    border: Colors.yellow.border,
  },
  NORMAL: {
    label: 'Normal',
    icon: 'remove-circle',
    bg: Colors.red.bg,
    text: Colors.red.primary,
    border: Colors.red.border,
  },
};

interface ClassificationBadgeProps {
  classification: Classification;
  size?: 'sm' | 'md' | 'lg';
}

export function ClassificationBadge({
  classification,
  size = 'md',
}: ClassificationBadgeProps) {
  const cfg = CONFIG[classification] ?? CONFIG.NORMAL;
  const fontSize = size === 'sm' ? 10 : size === 'lg' ? 14 : 12;
  const iconSize = size === 'sm' ? 10 : size === 'lg' ? 14 : 12;
  const paddingV = size === 'sm' ? 2 : size === 'lg' ? 6 : 4;
  const paddingH = size === 'sm' ? 6 : size === 'lg' ? 12 : 8;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name={cfg.icon} size={iconSize} color={cfg.text} />
        <Text style={[styles.text, { color: cfg.text, fontSize }]}>
          {cfg.label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 24,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontWeight: '600',
  },
});

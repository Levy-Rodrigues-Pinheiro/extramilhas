import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SubscriptionPlan } from '../types';

const CONFIG: Record<SubscriptionPlan, { label: string; bg: string; text: string }> = {
  FREE: { label: 'Gratuito', bg: '#141C2F', text: '#94a3b8' },
  PREMIUM: { label: 'Premium', bg: '#312E81', text: '#818CF8' },
  PRO: { label: 'Pro', bg: '#4C1D95', text: '#A78BFA' },
};

interface PlanBadgeProps {
  plan: SubscriptionPlan;
}

export function PlanBadge({ plan }: PlanBadgeProps) {
  const cfg = CONFIG[plan];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

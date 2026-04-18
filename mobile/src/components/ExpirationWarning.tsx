import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/theme';

interface ExpiringBalance {
  program?: { name?: string };
  programName?: string;
  balance: number;
  expiresAt?: string;
}

interface ExpirationWarningProps {
  balances: ExpiringBalance[];
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatBalance(value: number): string {
  if (value >= 1000) {
    return value.toLocaleString('pt-BR');
  }
  return String(value);
}

export function ExpirationWarning({ balances }: ExpirationWarningProps) {
  if (!balances || balances.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="warning" size={18} color={Colors.red.primary} />
        <Text style={styles.title}>Milhas Expirando!</Text>
      </View>
      {balances.map((item, index) => {
        if (!item.expiresAt) return null;
        const days = getDaysUntil(item.expiresAt);
        const programName = item.program?.name ?? item.programName ?? 'Programa';
        return (
          <Text key={index} style={styles.itemText}>
            {programName}: {formatBalance(item.balance)} mi — expira em {days} {days === 1 ? 'dia' : 'dias'}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.red.bg,
    borderWidth: 1,
    borderColor: Colors.red.border,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.red.primary,
  },
  itemText: {
    fontSize: 13,
    color: Colors.text.primary,
    lineHeight: 20,
  },
});

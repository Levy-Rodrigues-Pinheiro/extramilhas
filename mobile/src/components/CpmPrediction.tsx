import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/theme';

interface CpmPredictionProps {
  prediction: any;
}

const TREND_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  DOWN: { icon: 'trending-down', color: Colors.green.primary },
  UP: { icon: 'trending-up', color: Colors.red.primary },
  STABLE: { icon: 'remove', color: Colors.yellow.primary },
};

const RECOMMENDATION_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  COMPRAR: {
    label: 'Comprar',
    bg: Colors.green.bg,
    text: Colors.green.primary,
    border: Colors.green.border,
  },
  ESPERAR: {
    label: 'Esperar',
    bg: Colors.red.bg,
    text: Colors.red.primary,
    border: Colors.red.border,
  },
  NEUTRO: {
    label: 'Neutro',
    bg: Colors.yellow.bg,
    text: Colors.yellow.primary,
    border: Colors.yellow.border,
  },
};

export function CpmPrediction({ prediction }: CpmPredictionProps) {
  if (!prediction) return null;

  const trend = TREND_CONFIG[prediction.trend] ?? TREND_CONFIG.STABLE;
  const rec = RECOMMENDATION_CONFIG[prediction.recommendation] ?? RECOMMENDATION_CONFIG.NEUTRO;
  const confidence = Math.round((prediction.confidence ?? 0) * 100);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="analytics" size={18} color={Colors.primary.light} />
        <Text style={styles.headerTitle}>Previsão IA</Text>
      </View>

      <View style={styles.trendRow}>
        <Ionicons name={trend.icon} size={24} color={trend.color} />
        <View style={styles.trendInfo}>
          <Text style={styles.trendLabel}>Tendência</Text>
          <Text style={[styles.trendValue, { color: trend.color }]}>
            {prediction.trend === 'DOWN' ? 'Queda' : prediction.trend === 'UP' ? 'Alta' : 'Estável'}
          </Text>
        </View>
      </View>

      <View style={styles.predictionsRow}>
        {prediction.predictedCpm7d != null && (
          <View style={styles.predictionItem}>
            <Text style={styles.predictionLabel}>CPM 7 dias</Text>
            <Text style={styles.predictionValue}>R${prediction.predictedCpm7d.toFixed(2)}</Text>
          </View>
        )}
        {prediction.predictedCpm30d != null && (
          <View style={styles.predictionItem}>
            <Text style={styles.predictionLabel}>CPM 30 dias</Text>
            <Text style={styles.predictionValue}>R${prediction.predictedCpm30d.toFixed(2)}</Text>
          </View>
        )}
      </View>

      <View style={styles.recRow}>
        <View style={[styles.recBadge, { backgroundColor: rec.bg, borderColor: rec.border }]}>
          <Text style={[styles.recBadgeText, { color: rec.text }]}>{rec.label}</Text>
        </View>
        <Text style={styles.confidenceText}>{confidence}% confiança</Text>
      </View>

      {prediction.reasoning ? (
        <Text style={styles.reasoning}>{prediction.reasoning}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  trendInfo: {
    flex: 1,
  },
  trendLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  trendValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  predictionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  predictionItem: {
    flex: 1,
    backgroundColor: Colors.bg.surface,
    borderRadius: 10,
    padding: 12,
  },
  predictionLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  predictionValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  recBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  recBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  confidenceText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  reasoning: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 19,
  },
});

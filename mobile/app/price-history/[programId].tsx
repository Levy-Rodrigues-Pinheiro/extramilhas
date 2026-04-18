import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProgram, usePriceHistory, usePrediction } from '../../src/hooks/usePrograms';
import { ProgramLogo } from '../../src/components/ProgramLogo';
import { CpmPrediction } from '../../src/components/CpmPrediction';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors } from '../../src/lib/theme';
import type { PriceHistoryRange, PriceHistoryPoint } from '../../src/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 80;
const CHART_HEIGHT = 140;

const RANGE_OPTIONS: { value: PriceHistoryRange; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
];

function LineChart({
  points,
  width,
  height,
  color,
}: {
  points: PriceHistoryPoint[];
  width: number;
  height: number;
  color: string;
}) {
  if (points.length < 2) return null;

  const values = points.map((p) => p.cpm);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const getX = (i: number) => (i / (points.length - 1)) * width;
  const getY = (v: number) => height - ((v - min) / range) * (height - 16) - 8;

  const labelIndices = [0, Math.floor(points.length / 2), points.length - 1];
  const dateLabels = labelIndices.map((i) => {
    const date = new Date(points[i].date);
    return { x: getX(i), label: `${date.getDate()}/${date.getMonth() + 1}` };
  });

  return (
    <View style={{ width, height: height + 24 }}>
      <View style={{ width, height, position: 'relative' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <View
            key={pct}
            style={{
              position: 'absolute',
              left: 0,
              top: height * pct,
              width,
              height: 1,
              backgroundColor: '#253349',
              opacity: 0.4,
            }}
          />
        ))}

        {points.map((p, i) => {
          if (i === points.length - 1) return null;
          const x1 = getX(i);
          const x2 = getX(i + 1);
          const y1 = getY(p.cpm);
          const y2 = getY(points[i + 1].cpm);
          const dx = x2 - x1;
          const dy = y2 - y1;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: x1,
                top: y1,
                width: length,
                height: 2.5,
                backgroundColor: color,
                transform: [{ rotate: `${angle}deg` }],
              }}
            />
          );
        })}

        {points.length > 0 && (
          <View
            style={{
              position: 'absolute',
              left: getX(points.length - 1) - 5,
              top: getY(points[points.length - 1].cpm) - 5,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: color,
              borderWidth: 2,
              borderColor: Colors.bg.primary,
            }}
          />
        )}
      </View>

      <View style={{ width, flexDirection: 'row', marginTop: 6 }}>
        {dateLabels.map((dl, i) => (
          <Text
            key={i}
            style={{
              position: 'absolute',
              left: dl.x - 16,
              fontSize: 10,
              color: '#94a3b8',
              width: 32,
              textAlign: 'center',
            }}
          >
            {dl.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function PriceHistoryScreen() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const [range, setRange] = useState<PriceHistoryRange>('30d');

  const { data: program, isLoading: programLoading } = useProgram(programId ?? '');
  const { data: history, isLoading: historyLoading, isError } = usePriceHistory(
    programId ?? '',
    range
  );
  const { data: prediction } = usePrediction(programId ?? '');

  const isLoading = programLoading || historyLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#f8fafc" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Histórico de Preços</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !history) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#f8fafc" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Histórico de Preços</Text>
          <View style={styles.headerSpacer} />
        </View>
        <EmptyState
          icon="bar-chart-outline"
          title="Dados indisponíveis"
          description="Não foi possível carregar o histórico de preços para este programa."
        />
      </SafeAreaView>
    );
  }

  const statCards = [
    { label: 'CPM Atual', value: `R$${history.currentCpm.toFixed(2)}`, color: '#3B82F6' },
    { label: 'CPM Médio', value: `R$${history.averageCpm.toFixed(2)}`, color: '#f8fafc' },
    { label: 'Mínimo', value: `R$${history.minCpm.toFixed(2)}`, color: '#22c55e' },
    { label: 'Máximo', value: `R$${history.maxCpm.toFixed(2)}`, color: '#ef4444' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {program?.name ?? 'Programa'} · Histórico
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {program && (
          <View style={styles.programRow}>
            <ProgramLogo slug={program.slug} size={48} />
            <View style={styles.programInfo}>
              <Text style={styles.programName}>{program.name}</Text>
              <Text style={styles.programCpm}>
                CPM atual: R${program.currentCpm.toFixed(2)} / 1.000 mi
              </Text>
            </View>
          </View>
        )}

        <View style={styles.rangeRow}>
          {RANGE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.rangeButton, range === opt.value && styles.rangeButtonSelected]}
              onPress={() => setRange(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.rangeButtonText,
                  range === opt.value && styles.rangeButtonTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>CPM ao longo do tempo</Text>
            <Text style={styles.chartUnit}>R$ / 1.000 mi</Text>
          </View>

          {history.points.length > 1 ? (
            <View style={styles.chartContainer}>
              <View style={styles.chartYAxis}>
                <Text style={styles.chartYLabel}>R${history.maxCpm.toFixed(0)}</Text>
                <Text style={styles.chartYLabel}>
                  R${((history.maxCpm + history.minCpm) / 2).toFixed(0)}
                </Text>
                <Text style={styles.chartYLabel}>R${history.minCpm.toFixed(0)}</Text>
              </View>
              <LineChart
                points={history.points}
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                color="#3B82F6"
              />
            </View>
          ) : (
            <View style={styles.chartEmpty}>
              <Text style={styles.chartEmptyText}>
                Dados insuficientes para exibir o gráfico
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statsGrid}>
          {statCards.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            </View>
          ))}
        </View>

        {history.points.length >= 2 && (
          <View style={styles.trendCard}>
            <View style={styles.trendHeader}>
              <Ionicons
                name={
                  history.currentCpm <= history.averageCpm
                    ? 'trending-down-outline'
                    : 'trending-up-outline'
                }
                size={20}
                color={history.currentCpm <= history.averageCpm ? '#22c55e' : '#ef4444'}
              />
              <Text style={styles.trendTitle}>Análise de tendência</Text>
            </View>
            <Text style={styles.trendText}>
              {history.currentCpm <= history.averageCpm * 0.95
                ? `O CPM atual está ${Math.round(((history.averageCpm - history.currentCpm) / history.averageCpm) * 100)}% abaixo da média. Boa oportunidade de compra!`
                : history.currentCpm >= history.averageCpm * 1.05
                ? `O CPM atual está ${Math.round(((history.currentCpm - history.averageCpm) / history.averageCpm) * 100)}% acima da média. Considere aguardar.`
                : 'O CPM atual está próximo da média histórica do período.'}
            </Text>
          </View>
        )}

        {prediction && <CpmPrediction prediction={prediction} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#141C2F',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#141C2F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#253349',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  programInfo: {
    flex: 1,
  },
  programName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  programCpm: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 3,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#253349',
    backgroundColor: '#141C2F',
    alignItems: 'center',
  },
  rangeButtonSelected: {
    borderColor: '#818CF8',
    backgroundColor: '#312E81',
  },
  rangeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  rangeButtonTextSelected: {
    color: '#818CF8',
  },
  chartCard: {
    backgroundColor: '#141C2F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#253349',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  chartUnit: {
    fontSize: 11,
    color: '#94a3b8',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartYAxis: {
    justifyContent: 'space-between',
    height: CHART_HEIGHT,
    paddingVertical: 8,
  },
  chartYLabel: {
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'right',
  },
  chartEmpty: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmptyText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#141C2F',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#253349',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  trendCard: {
    backgroundColor: '#141C2F',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#253349',
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  trendTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  trendText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTransferCalculator, TransferCalcResult } from '../src/hooks/useArbitrage';

/**
 * Calculadora "Vale a pena transferir AGORA?"
 *
 * Usuário escolhe programa origem + quantidade. App mostra resultado em
 * cada destino possível, classificado em TRANSFERIR / ESPERAR / NÃO TRANSFERIR.
 */

const PROGRAMS = [
  { slug: 'livelo', name: 'Livelo', color: '#E91E63' },
  { slug: 'esfera', name: 'Esfera', color: '#9C27B0' },
  { slug: 'smiles', name: 'Smiles (GOL)', color: '#FF9800' },
  { slug: 'tudoazul', name: 'TudoAzul', color: '#2196F3' },
  { slug: 'latampass', name: 'Latam Pass', color: '#F44336' },
];

export default function TransferCalculatorScreen() {
  const params = useLocalSearchParams<{ from?: string; points?: string }>();
  const [fromProgram, setFromProgram] = useState(
    PROGRAMS.find((p) => p.slug === params.from)?.slug ?? 'livelo',
  );
  const [points, setPoints] = useState(params.points ?? '10000');
  const calc = useTransferCalculator();

  // Deep link: se abriu com `?from=livelo&points=50000`, já calcula
  useEffect(() => {
    if (params.from && params.points) {
      const numPoints = parseInt(String(params.points).replace(/\D/g, ''), 10);
      if (numPoints && numPoints >= 100) {
        calc.mutate({ fromProgramSlug: String(params.from), points: numPoints });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCalculate = () => {
    const numPoints = parseInt(points.replace(/\D/g, ''), 10);
    if (!numPoints || numPoints < 100) return;
    calc.mutate({ fromProgramSlug: fromProgram, points: numPoints });
  };

  const shareResult = async () => {
    if (!calc.data) return;
    const best = calc.data.results.find((r) => r.recommendation === 'TRANSFERIR');
    const header = best
      ? `💰 ${calc.data.inputPoints.toLocaleString('pt-BR')} pts ${calc.data.fromProgram.name} → vale R$ ${calc.data.inputValueBrl.toFixed(2)}\n` +
        `🎯 Melhor destino: ${best.toProgram.name} (${best.recommendation})\n\n`
      : `💰 Calculei ${calc.data.inputPoints.toLocaleString('pt-BR')} pts ${calc.data.fromProgram.name} = R$ ${calc.data.inputValueBrl.toFixed(2)}\n\n`;

    const link = `https://milhasextras.com.br/app/calculator?from=${encodeURIComponent(
      calc.data.fromProgram.slug,
    )}&points=${encodeURIComponent(String(calc.data.inputPoints))}`;

    const message =
      header +
      `Calcule o seu no Milhas Extras:\n${link}`;
    try {
      await Share.share({ message });
    } catch {
      /* user cancelou */
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Vale a pena transferir?</Text>
            <Text style={styles.subtitle}>Calcula valor real em cada destino</Text>
          </View>
          {calc.data && (
            <TouchableOpacity
              onPress={shareResult}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Compartilhar cálculo"
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons name="share-social-outline" size={22} color="#25D366" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Form */}
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>De qual programa você quer transferir?</Text>
            <View style={styles.programGrid}>
              {PROGRAMS.map((p) => (
                <TouchableOpacity
                  key={p.slug}
                  onPress={() => setFromProgram(p.slug)}
                  style={[
                    styles.programChip,
                    fromProgram === p.slug && { borderColor: p.color, backgroundColor: `${p.color}20` },
                  ]}
                >
                  <Text
                    style={[
                      styles.programChipText,
                      fromProgram === p.slug && { color: p.color, fontWeight: '700' },
                    ]}
                  >
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.formLabel, { marginTop: 20 }]}>Quantos pontos você tem?</Text>
            <TextInput
              style={styles.input}
              value={points}
              onChangeText={(v) => setPoints(v.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder="ex: 10000"
              placeholderTextColor="#475569"
              maxLength={8}
            />

            <TouchableOpacity
              onPress={handleCalculate}
              disabled={calc.isPending || !points}
              activeOpacity={0.8}
              style={styles.submitBtn}
            >
              <LinearGradient
                colors={['#3B82F6', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtnGradient}
              >
                {calc.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="calculator-outline" size={18} color="#fff" />
                    <Text style={styles.submitBtnText}>Calcular agora</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Erro */}
          {calc.error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.errorText}>{calc.error.message || 'Erro no cálculo'}</Text>
            </View>
          )}

          {/* Resultados */}
          {calc.data && <ResultsList data={calc.data} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ResultsList({ data }: { data: TransferCalcResult }) {
  return (
    <View style={{ marginTop: 8 }}>
      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>Você tem</Text>
        <Text style={styles.summaryValue}>
          {data.inputPoints.toLocaleString('pt-BR')} pts {data.fromProgram.name}
        </Text>
        <Text style={styles.summarySub}>
          ≈ R$ {data.inputValueBrl.toFixed(2)} (CPM {data.fromProgram.avgCpm.toFixed(2)})
        </Text>
      </View>

      {data.results.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="information-circle-outline" size={32} color="#64748B" />
          <Text style={styles.emptyText}>
            Nenhuma transferência ativa pra esse programa no momento.
          </Text>
        </View>
      ) : (
        data.results.map((r, i) => <ResultCard key={i} item={r} />)
      )}
    </View>
  );
}

function ResultCard({ item }: { item: TransferCalcResult['results'][0] }) {
  const recColor =
    item.recommendation === 'TRANSFERIR' ? '#10B981'
    : item.recommendation === 'ESPERAR' ? '#F59E0B'
    : '#EF4444';
  const recLabel =
    item.recommendation === 'TRANSFERIR' ? 'TRANSFERIR'
    : item.recommendation === 'ESPERAR' ? 'ESPERAR' : 'NÃO TRANSFERIR';
  const recIcon =
    item.recommendation === 'TRANSFERIR' ? 'checkmark-circle'
    : item.recommendation === 'ESPERAR' ? 'time' : 'close-circle';

  return (
    <View style={styles.resultCard}>
      <LinearGradient
        colors={[`${recColor}15`, `${recColor}05`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.resultGradient}
      >
        {/* Header: badge + destino */}
        <View style={styles.resultHeader}>
          <View style={[styles.badge, { backgroundColor: `${recColor}25`, borderColor: recColor }]}>
            <Ionicons name={recIcon as any} size={12} color={recColor} />
            <Text style={[styles.badgeText, { color: recColor }]}>{recLabel}</Text>
          </View>
          <Text style={styles.bonusBig}>+{item.bonusActive.toFixed(0)}%</Text>
        </View>

        <Text style={styles.destProgram}>→ {item.toProgram.name}</Text>

        {/* Métricas */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Vira</Text>
            <Text style={styles.metricValue}>
              {item.resultingMiles.toLocaleString('pt-BR')} mi
            </Text>
            <Text style={styles.metricSub}>R$ {item.resultingValueBrl.toFixed(2)}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Ganho</Text>
            <Text style={[styles.metricValue, { color: recColor }]}>
              {item.gainPercent > 0 ? '+' : ''}{item.gainPercent.toFixed(1)}%
            </Text>
            <Text style={[styles.metricSub, { color: recColor }]}>
              {item.valueGainBrl > 0 ? '+' : ''}R$ {item.valueGainBrl.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Reasoning */}
        <View style={styles.reasoningBox}>
          <Text style={styles.reasoningText}>{item.reasoning}</Text>
        </View>

        {/* Examples */}
        {item.examples && item.examples.length > 0 && (
          <View style={styles.examplesBox}>
            <Text style={styles.examplesTitle}>Onde você poderia ir:</Text>
            {item.examples.slice(0, 2).map((ex, i) => (
              <View key={i} style={styles.exampleRow}>
                <Ionicons name="airplane" size={12} color="#94A3B8" />
                <Text style={styles.exampleText}>
                  {ex.destination} · {ex.milesNeeded.toLocaleString('pt-BR')} mi
                  {ex.tripsPossible > 1 && (
                    <Text style={styles.exampleBold}> ({ex.tripsPossible}× passagens)</Text>
                  )}
                </Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1E293B',
  },
  backBtn: { padding: 8, width: 40 },
  titleBox: { flex: 1 },
  title: { color: '#fff', fontSize: 19, fontWeight: '700' },
  subtitle: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },

  formCard: {
    backgroundColor: '#1E293B', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#334155', marginBottom: 16,
  },
  formLabel: {
    color: '#94A3B8', fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  programGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  programChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#334155',
    borderRadius: 20, backgroundColor: '#0F172A',
  },
  programChipText: { color: '#CBD5E1', fontSize: 12, fontWeight: '500' },
  input: {
    backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    color: '#F1F5F9', fontSize: 18, fontWeight: '600',
    letterSpacing: 0.5,
  },
  submitBtn: { marginTop: 16, borderRadius: 10, overflow: 'hidden' },
  submitBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  errorBox: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: '#7F1D1D33', borderColor: '#EF4444', borderWidth: 1,
    padding: 12, borderRadius: 8, marginBottom: 12,
  },
  errorText: { color: '#FCA5A5', fontSize: 13, flex: 1 },

  summaryBox: {
    backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#334155',
  },
  summaryLabel: { color: '#64748B', fontSize: 11, textTransform: 'uppercase', fontWeight: '600' },
  summaryValue: { color: '#F1F5F9', fontSize: 18, fontWeight: '700', marginTop: 4 },
  summarySub: { color: '#94A3B8', fontSize: 12, marginTop: 4 },

  emptyBox: { alignItems: 'center', padding: 30, gap: 10 },
  emptyText: { color: '#94A3B8', fontSize: 13, textAlign: 'center' },

  resultCard: { marginBottom: 12, borderRadius: 14, overflow: 'hidden' },
  resultGradient: {
    padding: 16, backgroundColor: '#1E293B',
    borderWidth: 1, borderColor: '#334155', borderRadius: 14,
  },
  resultHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  bonusBig: {
    color: '#8B5CF6', fontSize: 16, fontWeight: '800',
    backgroundColor: '#3B2F66', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 4,
  },
  destProgram: {
    color: '#F1F5F9', fontSize: 18, fontWeight: '700', marginBottom: 14,
  },

  metricsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#334155',
  },
  metric: { flex: 1, alignItems: 'center' },
  metricLabel: {
    color: '#64748B', fontSize: 10, fontWeight: '600',
    textTransform: 'uppercase', marginBottom: 4,
  },
  metricValue: { color: '#F1F5F9', fontSize: 16, fontWeight: '700' },
  metricSub: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  metricDivider: { width: 1, backgroundColor: '#334155', alignSelf: 'stretch' },

  reasoningBox: { paddingTop: 12 },
  reasoningText: { color: '#CBD5E1', fontSize: 13, lineHeight: 18 },

  examplesBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  examplesTitle: {
    color: '#94A3B8', fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  exampleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  exampleText: { color: '#CBD5E1', fontSize: 12 },
  exampleBold: { color: '#10B981', fontWeight: '700' },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { usePortfolioAnalysis, useSignals } from '../src/hooks/usePortfolio';
import { Colors, Gradients } from '../src/lib/theme';

const SIGNAL_META: Record<
  string,
  { label: string; color: string; bg: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }
> = {
  BUY_STRONG: { label: 'BUY ⚡', color: '#10B981', bg: '#10B98125', icon: 'trending-up' },
  BUY: { label: 'BUY', color: '#10B981', bg: '#10B98115', icon: 'trending-up' },
  HOLD: { label: 'HOLD', color: '#94A3B8', bg: '#94A3B815', icon: 'pause' },
  SELL: { label: 'SELL', color: '#F59E0B', bg: '#F59E0B20', icon: 'trending-down' },
};

export default function PortfolioAnalysisScreen() {
  const { t } = useTranslation();
  const { data: analysis, isLoading: ln } = usePortfolioAnalysis();
  const { data: signals, isLoading: ls } = useSignals();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Análise da carteira</Text>
        <View style={{ width: 40 }} />
      </View>

      {ln ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary.light} />
        </View>
      ) : !analysis ? (
        <View style={styles.center}>
          <Text style={{ color: Colors.text.secondary }}>{t('errors.generic')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Concentração HHI */}
          <LinearGradient colors={Gradients.primary as unknown as readonly [string, string]} style={styles.heroBox}>
            <Text style={styles.heroLabel}>Concentração</Text>
            <Text style={styles.heroValue}>
              {analysis.concentration ?? '—'}
            </Text>
            <Text style={styles.heroTag}>{analysis.concentrationLabel}</Text>
            {analysis.dominantProgram && (
              <Text style={styles.heroSub}>
                {analysis.dominantProgram.sharePercent}% em {analysis.dominantProgram.programName}
              </Text>
            )}
          </LinearGradient>

          {/* Breakdown */}
          {analysis.breakdown.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Composição</Text>
              <View style={styles.breakdownBox}>
                {analysis.breakdown.map((b) => (
                  <View key={b.programId} style={styles.breakdownRow}>
                    <Text style={styles.breakProgram}>{b.programName}</Text>
                    <View style={styles.breakBarBg}>
                      <View
                        style={[styles.breakBarFill, { width: `${Math.max(2, b.sharePercent)}%` }]}
                      />
                    </View>
                    <Text style={styles.breakPct}>{b.sharePercent}%</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Suggestions */}
          {analysis.suggestions.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Recomendações</Text>
              {analysis.suggestions.map((s, i) => (
                <View
                  key={i}
                  style={[
                    styles.sugCard,
                    s.severity === 'warn' && styles.sugWarn,
                    s.severity === 'critical' && styles.sugCrit,
                  ]}
                  accessible
                  accessibilityLabel={`${s.severity}: ${s.title}. ${s.text}`}
                >
                  <Ionicons
                    name={
                      s.severity === 'critical'
                        ? 'alert-circle'
                        : s.severity === 'warn'
                        ? 'warning-outline'
                        : 'information-circle-outline'
                    }
                    size={18}
                    color={
                      s.severity === 'critical'
                        ? Colors.red.primary
                        : s.severity === 'warn'
                        ? Colors.yellow.primary
                        : Colors.primary.light
                    }
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sugTitle}>{s.title}</Text>
                    <Text style={styles.sugText}>{s.text}</Text>
                    {s.action && (
                      <TouchableOpacity
                        onPress={() => router.push(s.action! as any)}
                        style={styles.sugAction}
                        accessibilityRole="button"
                      >
                        <Text style={styles.sugActionText}>Ver →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Signals */}
          <Text style={styles.sectionTitle}>Sinais de mercado</Text>
          {ls ? (
            <ActivityIndicator color={Colors.primary.light} style={{ padding: 20 }} />
          ) : !signals || signals.length === 0 ? (
            <Text style={styles.emptySignals}>
              Histórico insuficiente pra sinais. Volte em alguns dias.
            </Text>
          ) : (
            signals.map((s) => {
              const meta = SIGNAL_META[s.signal];
              return (
                <View key={s.programId} style={styles.sigCard} accessible accessibilityLabel={`${s.programName}: sinal ${meta.label}. ${s.text}`}>
                  <View style={styles.sigHeader}>
                    <Text style={styles.sigProgram}>{s.programName}</Text>
                    <View style={[styles.sigBadge, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon} size={12} color={meta.color} />
                      <Text style={[styles.sigBadgeText, { color: meta.color }]}>
                        {meta.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.sigCpm}>
                    CPM atual R$ {s.currentCpm.toFixed(2)} · mediana 30d R$ {s.median30d.toFixed(2)}
                  </Text>
                  <Text style={styles.sigText}>{s.text}</Text>
                </View>
              );
            })
          )}

          <View style={styles.disclaimerBox}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.text.muted} />
            <Text style={styles.disclaimerText}>
              Sinais baseados em regras simples (mediana 30d). Não é recomendação financeira — use
              como apoio à decisão.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg.card,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  heroBox: { borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20 },
  heroLabel: { color: '#fff', opacity: 0.85, fontSize: 12, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 44, fontWeight: '800', marginVertical: 4 },
  heroTag: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  heroSub: { color: '#fff', opacity: 0.85, fontSize: 12, marginTop: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 10,
  },
  breakdownBox: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    gap: 8,
  },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  breakProgram: { width: 90, fontSize: 12, fontWeight: '600', color: Colors.text.primary },
  breakBarBg: { flex: 1, height: 8, backgroundColor: Colors.bg.surface, borderRadius: 4, overflow: 'hidden' },
  breakBarFill: { height: '100%', backgroundColor: Colors.primary.light, borderRadius: 4 },
  breakPct: { width: 44, textAlign: 'right', fontSize: 12, fontWeight: '700', color: Colors.text.primary },
  sugCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginBottom: 8,
  },
  sugWarn: { borderColor: Colors.yellow.border, backgroundColor: Colors.yellow.bg },
  sugCrit: { borderColor: Colors.red.border, backgroundColor: Colors.red.bg },
  sugTitle: { fontSize: 13, fontWeight: '700', color: Colors.text.primary, marginBottom: 2 },
  sugText: { fontSize: 12, color: Colors.text.secondary, lineHeight: 16 },
  sugAction: { marginTop: 6 },
  sugActionText: { fontSize: 12, color: Colors.primary.light, fontWeight: '700' },
  sigCard: {
    padding: 12,
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginBottom: 8,
  },
  sigHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sigProgram: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  sigBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sigBadgeText: { fontSize: 11, fontWeight: '800' },
  sigCpm: { fontSize: 11, color: Colors.text.muted, marginBottom: 4 },
  sigText: { fontSize: 12, color: Colors.text.primary, lineHeight: 16 },
  emptySignals: { fontSize: 12, color: Colors.text.muted, textAlign: 'center', padding: 16 },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.bg.surface,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: Colors.text.muted, lineHeight: 15 },
});

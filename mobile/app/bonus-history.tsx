import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../src/lib/api';
import { SkeletonCard } from '../src/components/Skeleton';

interface HistoryReport {
  id: string;
  fromProgramSlug: string;
  toProgramSlug: string;
  bonusPercent: number;
  expiresAt: string | null;
  createdAt: string;
}

/**
 * Timeline de bônus aprovados recentes. Mostra não só ativos (aba Arbitragem)
 * mas TODO o histórico: o que já passou + o que ainda vale. Permite user ver
 * padrões ("Livelo→Smiles aparece toda 3 semanas").
 */
function useHistoryReports(days: number) {
  return useQuery({
    queryKey: ['bonus-history', days],
    queryFn: async () => {
      const { data } = await api.get(`/bonus-reports/recent?days=${days}`);
      return data as { count: number; reports: HistoryReport[] };
    },
    staleTime: 60_000,
  });
}

type Window = 7 | 30 | 90;

export default function BonusHistoryScreen() {
  const [window, setWindow] = useState<Window>(30);
  const { data, isLoading, isRefetching, refetch } = useHistoryReports(window);

  const groupedByDay = React.useMemo(() => {
    const map = new Map<string, HistoryReport[]>();
    (data?.reports || []).forEach((r) => {
      const day = new Date(r.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      });
      const arr = map.get(day) || [];
      arr.push(r);
      map.set(day, arr);
    });
    return Array.from(map.entries());
  }, [data]);

  const stats = React.useMemo(() => {
    const list = data?.reports || [];
    if (list.length === 0) return null;
    const avg = list.reduce((s, r) => s + r.bonusPercent, 0) / list.length;
    const max = list.reduce((m, r) => Math.max(m, r.bonusPercent), 0);
    return { count: list.length, avg: avg.toFixed(0), max: max.toFixed(0) };
  }, [data]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.titleBox}>
          <Text style={styles.title}>Histórico de bônus</Text>
          <Text style={styles.subtitle}>Todos aprovados pela comunidade</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#8B5CF6" />
        }
      >
        <View style={styles.windowRow}>
          {[7, 30, 90].map((w) => (
            <TouchableOpacity
              key={w}
              onPress={() => setWindow(w as Window)}
              style={[styles.windowBtn, window === w && styles.windowBtnActive]}
            >
              <Text style={[styles.windowText, window === w && styles.windowTextActive]}>
                {w}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.count}</Text>
              <Text style={styles.statLabel}>Bônus</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.avg}%</Text>
              <Text style={styles.statLabel}>Média</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.max}%</Text>
              <Text style={styles.statLabel}>Maior</Text>
            </View>
          </View>
        )}

        {isLoading && (
          <View>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </View>
        )}

        {!isLoading && groupedByDay.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={40} color="#64748B" />
            <Text style={styles.emptyTitle}>Sem bônus nessa janela</Text>
            <Text style={styles.emptyText}>
              Mude o período acima ou volte em breve — bônus novos aparecem a cada semana.
            </Text>
          </View>
        )}

        {groupedByDay.map(([day, reports]) => (
          <View key={day} style={styles.dayBlock}>
            <View style={styles.dayHeader}>
              <View style={styles.dayDot} />
              <Text style={styles.dayLabel}>{day}</Text>
              <Text style={styles.daySub}>
                {reports.length} bônus{reports.length > 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.dayItems}>
              {reports.map((r) => {
                const pct = Math.round(r.bonusPercent);
                const color = pct >= 80 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#94A3B8';
                const daysLeft = r.expiresAt
                  ? Math.ceil((new Date(r.expiresAt).getTime() - Date.now()) / 86400_000)
                  : null;
                const expired = daysLeft !== null && daysLeft < 0;
                return (
                  <View key={r.id} style={[styles.reportCard, expired && { opacity: 0.5 }]}>
                    <View style={styles.reportLeft}>
                      <Text style={[styles.reportPct, { color }]}>+{pct}%</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportTitle}>
                        {r.fromProgramSlug} → {r.toProgramSlug}
                      </Text>
                      {r.expiresAt && (
                        <Text style={styles.reportExpires}>
                          {expired
                            ? 'Expirou'
                            : daysLeft === 0
                            ? 'Expira hoje'
                            : daysLeft === 1
                            ? 'Expira amanhã'
                            : `${daysLeft}d restantes`}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
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

  windowRow: {
    flexDirection: 'row', gap: 6, padding: 3,
    backgroundColor: '#1E293B', borderRadius: 10,
    borderWidth: 1, borderColor: '#334155',
    marginBottom: 14,
  },
  windowBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 7 },
  windowBtnActive: { backgroundColor: '#3B2F66' },
  windowText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  windowTextActive: { color: '#A78BFA' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1, padding: 12, borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1, borderColor: '#334155',
    alignItems: 'center',
  },
  statValue: { color: '#F1F5F9', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#94A3B8', fontSize: 11, marginTop: 2 },

  empty: { alignItems: 'center', gap: 10, padding: 40 },
  emptyTitle: { color: '#F1F5F9', fontSize: 15, fontWeight: '700' },
  emptyText: { color: '#94A3B8', fontSize: 12, textAlign: 'center', lineHeight: 18 },

  dayBlock: { marginBottom: 20 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dayDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8B5CF6' },
  dayLabel: { color: '#F1F5F9', fontSize: 13, fontWeight: '700' },
  daySub: { color: '#64748B', fontSize: 11, marginLeft: 'auto' },
  dayItems: { borderLeftWidth: 1, borderLeftColor: '#1E293B', paddingLeft: 14, gap: 8 },

  reportCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1, borderColor: '#334155',
  },
  reportLeft: { minWidth: 56 },
  reportPct: { fontSize: 20, fontWeight: '800' },
  reportTitle: { color: '#F1F5F9', fontSize: 14, fontWeight: '600' },
  reportExpires: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
});

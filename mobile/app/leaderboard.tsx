import React from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import {
  useLeaderboard,
  useMyLeaderboardStats,
  TIER_META,
  ReporterTier,
} from '../src/hooks/useLeaderboard';

/**
 * Ranking público de reporters de bônus.
 *
 * Por que: fecha o loop do crowdsource. Quem reporta bônus aprovado ganha
 * reputação visível (tier + rank), criando motivação intrínseca além do
 * push personalizado que chega quando cada report é aprovado.
 */
export default function LeaderboardScreen() {
  const top = useLeaderboard(50);
  const me = useMyLeaderboardStats();

  const refreshing = top.isFetching || me.isFetching;
  const onRefresh = () => {
    top.refetch();
    me.refetch();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.titleBox}>
          <Text style={styles.title}>Ranking de Reporters</Text>
          <Text style={styles.subtitle}>Quem mais ajuda a comunidade</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
      >
        {/* Meu card */}
        {me.data && (
          <LinearGradient
            colors={[TIER_META[me.data.tier].bg, '#0F172A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.myCard}
          >
            <View style={styles.myRow}>
              <Text style={styles.myEmoji}>{TIER_META[me.data.tier].emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.myTitle}>Você é tier {TIER_META[me.data.tier].label}</Text>
                <Text style={styles.mySub}>
                  {me.data.approvedCount} report{me.data.approvedCount !== 1 ? 's' : ''} aprovado
                  {me.data.approvedCount !== 1 ? 's' : ''}
                  {me.data.rank !== null && ` · #${me.data.rank} no ranking`}
                </Text>
              </View>
            </View>
            {me.data.nextTier && (
              <View style={styles.progress}>
                <Text style={styles.progressText}>
                  Faltam <Text style={{ color: '#F1F5F9', fontWeight: '700' }}>{me.data.nextTier.needed}</Text>{' '}
                  pra virar {TIER_META[me.data.nextTier.name].label}
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(
                          100,
                          (me.data.approvedCount / me.data.nextTier.threshold) * 100,
                        )}%`,
                        backgroundColor: TIER_META[me.data.nextTier.name].color,
                      },
                    ]}
                  />
                </View>
              </View>
            )}
            <TouchableOpacity onPress={() => router.push('/report-bonus' as any)} style={styles.ctaBtn}>
              <Ionicons name="megaphone" size={14} color="#fff" />
              <Text style={styles.ctaText}>Reportar novo bônus</Text>
            </TouchableOpacity>
          </LinearGradient>
        )}

        {/* Seção "Como funciona" compacta */}
        <View style={styles.howBox}>
          <Text style={styles.howTitle}>Como funciona</Text>
          <Text style={styles.howText}>
            Reporta um bônus visto na newsletter ou no site. Quando o admin valida, todo mundo no app
            ganha — e você sobe no ranking.
          </Text>
          <View style={styles.tiersRow}>
            {(Object.keys(TIER_META) as ReporterTier[]).map((t) => (
              <View key={t} style={[styles.tierPill, { backgroundColor: TIER_META[t].bg }]}>
                <Text style={{ fontSize: 14 }}>{TIER_META[t].emoji}</Text>
                <Text style={[styles.tierPillText, { color: TIER_META[t].color }]}>
                  {TIER_META[t].label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Ranking */}
        <Text style={styles.sectionTitle}>Top 50 all-time</Text>

        {top.isLoading ? (
          <ActivityIndicator color="#8B5CF6" style={{ marginTop: 40 }} />
        ) : top.data?.reporters.length ? (
          top.data.reporters.map((r) => (
            <View key={r.userId} style={styles.row}>
              <View style={styles.rankBox}>
                {r.rank <= 3 ? (
                  <Text style={styles.rankMedal}>{['🥇', '🥈', '🥉'][r.rank - 1]}</Text>
                ) : (
                  <Text style={styles.rankNum}>#{r.rank}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{r.name}</Text>
                <Text style={styles.rowCount}>
                  {r.approvedCount} report{r.approvedCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={[styles.tierBadge, { backgroundColor: TIER_META[r.tier].bg }]}>
                <Text style={[styles.tierText, { color: TIER_META[r.tier].color }]}>
                  {TIER_META[r.tier].emoji} {TIER_META[r.tier].label}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons name="trophy-outline" size={36} color="#475569" />
            <Text style={styles.emptyText}>
              Ainda ninguém no ranking! Seja o primeiro a reportar.
            </Text>
            <TouchableOpacity onPress={() => router.push('/report-bonus' as any)} style={styles.emptyBtn}>
              <Text style={styles.emptyBtnText}>Reportar um bônus</Text>
            </TouchableOpacity>
          </View>
        )}
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

  myCard: {
    padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: '#1E293B',
    marginBottom: 20,
  },
  myRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  myEmoji: { fontSize: 40 },
  myTitle: { color: '#F1F5F9', fontSize: 17, fontWeight: '700' },
  mySub: { color: '#CBD5E1', fontSize: 13, marginTop: 2 },

  progress: { marginBottom: 12 },
  progressText: { color: '#94A3B8', fontSize: 12, marginBottom: 6 },
  progressBar: { height: 6, backgroundColor: '#0F172A', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 10, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  ctaText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  howBox: {
    padding: 14, borderRadius: 10,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
    marginBottom: 20,
  },
  howTitle: { color: '#F1F5F9', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  howText: { color: '#CBD5E1', fontSize: 12, lineHeight: 17, marginBottom: 10 },
  tiersRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tierPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12,
  },
  tierPillText: { fontSize: 11, fontWeight: '600' },

  sectionTitle: {
    color: '#94A3B8', fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 10,
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, marginBottom: 8,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
    borderRadius: 10,
  },
  rankBox: { width: 40, alignItems: 'center' },
  rankMedal: { fontSize: 22 },
  rankNum: { color: '#64748B', fontSize: 14, fontWeight: '700' },
  rowName: { color: '#F1F5F9', fontSize: 14, fontWeight: '600' },
  rowCount: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  tierBadge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  tierText: { fontSize: 11, fontWeight: '700' },

  empty: {
    alignItems: 'center', padding: 32, gap: 10,
    borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed',
    borderRadius: 12,
  },
  emptyText: { color: '#94A3B8', fontSize: 13, textAlign: 'center' },
  emptyBtn: {
    marginTop: 8, paddingHorizontal: 18, paddingVertical: 10,
    backgroundColor: '#8B5CF6', borderRadius: 8,
  },
  emptyBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});

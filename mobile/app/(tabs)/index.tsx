import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTransferBonuses } from '../../src/hooks/useArbitrage';
import { useWallet } from '../../src/hooks/useWallet';
import { useMyLeaderboardStats, TIER_META } from '../../src/hooks/useLeaderboard';

/**
 * Home — dashboard focado em arbitragem de milhas.
 *
 * Hierarquia visual:
 * 1. Saudação + valor da carteira (orgulho/familiaridade)
 * 2. Quick actions (calc, oportunidades, alertas)
 * 3. Top oportunidades de transferência (CTA principal)
 * 4. CTA pra cadastrar saldo (se carteira vazia)
 *
 * Substitui o feed de ofertas — pivot pra monetização via arbitragem.
 */
export default function HomeScreen() {
  const wallet = useWallet();
  const bonuses = useTransferBonuses();
  const leaderboard = useMyLeaderboardStats();

  const refreshing = wallet.isRefetching || bonuses.isRefetching;
  const refetchAll = () => {
    wallet.refetch();
    bonuses.refetch();
  };

  const totalValue = wallet.data?.summary.totalValueBrl ?? 0;
  const programsCount = wallet.data?.summary.programsCount ?? 0;
  const topOpportunities = (bonuses.data?.opportunities || [])
    .filter((o) => o.classification !== 'NORMAL')
    .slice(0, 3);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetchAll} tintColor="#8B5CF6" />
        }
      >
        {/* Greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá! 👋</Text>
            <Text style={styles.subtitle}>Suas milhas, sua arbitragem</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <View style={styles.avatarBox}>
              <Ionicons name="person" size={20} color="#8B5CF6" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Hero: valor da carteira (clicável → vai pra carteira) */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/(tabs)/wallet' as any)}>
          <LinearGradient
            colors={['#8B5CF6', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroTop}>
              <Text style={styles.heroLabel}>Sua carteira vale</Text>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </View>
            {wallet.isLoading ? (
              <ActivityIndicator color="#fff" style={{ marginTop: 12 }} />
            ) : (
              <>
                <Text style={styles.heroValue}>
                  R$ {totalValue.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <Text style={styles.heroSub}>
                  {programsCount === 0
                    ? 'Cadastre seus saldos →'
                    : `${programsCount} programa${programsCount !== 1 ? 's' : ''}`}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <QuickAction
            icon="calculator"
            label="Vale a pena?"
            color="#10B981"
            onPress={() => router.push('/(tabs)/calculator' as any)}
          />
          <QuickAction
            icon="trending-up"
            label="Oportunidades"
            color="#F59E0B"
            badge={topOpportunities.length}
            onPress={() => router.push('/arbitrage' as any)}
          />
          <QuickAction
            icon="notifications"
            label="Alertas"
            color="#3B82F6"
            onPress={() => router.push('/(tabs)/alerts')}
          />
        </View>

        {/* Meu tier (só pra quem já tem aprovados — evita ruído pra novato) */}
        {leaderboard.data && leaderboard.data.approvedCount > 0 && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/leaderboard' as any)}
            style={styles.tierCard}
          >
            <Text style={styles.tierEmoji}>{TIER_META[leaderboard.data.tier].emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tierTitle}>
                Você é tier {TIER_META[leaderboard.data.tier].label}
              </Text>
              <Text style={styles.tierSub}>
                {leaderboard.data.approvedCount} report
                {leaderboard.data.approvedCount !== 1 ? 's' : ''} aprovado
                {leaderboard.data.approvedCount !== 1 ? 's' : ''}
                {leaderboard.data.rank !== null && ` · #${leaderboard.data.rank}`}
                {leaderboard.data.nextTier &&
                  ` · faltam ${leaderboard.data.nextTier.needed} pra ${TIER_META[leaderboard.data.nextTier.name].label}`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </TouchableOpacity>
        )}

        {/* Top oportunidades */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 Bônus ativos agora</Text>
            <TouchableOpacity onPress={() => router.push('/arbitrage' as any)}>
              <Text style={styles.sectionLink}>Ver todos →</Text>
            </TouchableOpacity>
          </View>

          {bonuses.isLoading && (
            <View style={styles.loaderBox}>
              <ActivityIndicator color="#8B5CF6" />
            </View>
          )}

          {!bonuses.isLoading && topOpportunities.length === 0 && (
            <View style={styles.emptyBox}>
              <Ionicons name="time-outline" size={28} color="#64748B" />
              <Text style={styles.emptyText}>
                Nenhum bônus de transferência ativo agora.
              </Text>
              <Text style={styles.emptySub}>
                Te avisamos por push quando aparecer um.
              </Text>
            </View>
          )}

          {topOpportunities.map((op) => (
            <TouchableOpacity
              key={op.id}
              activeOpacity={0.85}
              onPress={() => router.push('/arbitrage' as any)}
              style={styles.opCard}
            >
              <View style={styles.opCardHeader}>
                <View
                  style={[
                    styles.opBadge,
                    {
                      backgroundColor:
                        op.classification === 'IMPERDIVEL' ? '#10B98125' : '#F59E0B25',
                      borderColor: op.classification === 'IMPERDIVEL' ? '#10B981' : '#F59E0B',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.opBadgeText,
                      {
                        color: op.classification === 'IMPERDIVEL' ? '#10B981' : '#F59E0B',
                      },
                    ]}
                  >
                    {op.classification === 'IMPERDIVEL' ? '🔥 IMPERDÍVEL' : '⚡ BOA'}
                  </Text>
                </View>
                <Text style={styles.opBonus}>+{op.currentBonus.toFixed(0)}%</Text>
              </View>
              <Text style={styles.opTitle}>
                {op.fromProgram.name} → {op.toProgram.name}
              </Text>
              <Text style={styles.opGain}>
                Ganho de {op.gainPercent.toFixed(1)}% em valor
              </Text>
              {op.userSourceBalance != null && op.potentialValueGain != null && (
                <View style={styles.opPersonal}>
                  <Ionicons name="wallet" size={12} color="#10B981" />
                  <Text style={styles.opPersonalText}>
                    Você ganha <Text style={styles.opPersonalBold}>R$ {op.potentialValueGain.toFixed(2)}</Text> com seu saldo
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA Carteira (se vazia) */}
        {programsCount === 0 && !wallet.isLoading && (
          <View style={styles.ctaBox}>
            <Ionicons name="wallet-outline" size={36} color="#8B5CF6" />
            <Text style={styles.ctaTitle}>Cadastre seus saldos</Text>
            <Text style={styles.ctaSub}>
              Só leva 30 segundos. As oportunidades ficam personalizadas pro SEU saldo —
              calculamos quanto VOCÊ ganha em R$.
            </Text>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => router.push('/(tabs)/wallet' as any)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#8B5CF6', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaBtnGradient}
              >
                <Text style={styles.ctaBtnText}>+ Adicionar primeiro saldo</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({
  icon,
  label,
  color,
  badge,
  onPress,
}: {
  icon: any;
  label: string;
  color: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.quickAction}>
      <View style={[styles.quickIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={22} color={color} />
        {badge != null && badge > 0 && (
          <View style={styles.badgeDot}>
            <Text style={styles.badgeDotText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 16, paddingBottom: 120 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  greeting: { color: '#fff', fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  avatarBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#334155',
  },

  hero: { borderRadius: 18, padding: 20, marginBottom: 16 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)', fontSize: 12,
    textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5,
  },
  heroValue: {
    color: '#fff', fontSize: 32, fontWeight: '800',
    marginTop: 8, letterSpacing: -1,
  },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },

  quickRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 24, gap: 8,
  },
  quickAction: { flex: 1, alignItems: 'center' },
  quickIcon: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  quickLabel: { color: '#CBD5E1', fontSize: 11, fontWeight: '600', marginTop: 6 },
  badgeDot: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#EF4444',
    minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeDotText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  tierCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, marginBottom: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12, borderWidth: 1, borderColor: '#334155',
  },
  tierEmoji: { fontSize: 32 },
  tierTitle: { color: '#F1F5F9', fontSize: 14, fontWeight: '700' },
  tierSub: { color: '#94A3B8', fontSize: 11, marginTop: 2 },

  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { color: '#F1F5F9', fontSize: 16, fontWeight: '700' },
  sectionLink: { color: '#8B5CF6', fontSize: 13, fontWeight: '600' },

  loaderBox: { paddingVertical: 30, alignItems: 'center' },
  emptyBox: {
    alignItems: 'center', padding: 24, gap: 6,
    backgroundColor: '#1E293B', borderRadius: 12,
    borderWidth: 1, borderColor: '#334155',
  },
  emptyText: { color: '#CBD5E1', fontSize: 13, textAlign: 'center' },
  emptySub: { color: '#64748B', fontSize: 11, textAlign: 'center' },

  opCard: {
    backgroundColor: '#1E293B', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#334155', marginBottom: 10,
  },
  opCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  opBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1,
  },
  opBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  opBonus: {
    color: '#A78BFA', fontSize: 14, fontWeight: '800',
    backgroundColor: '#3B2F66', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  opTitle: { color: '#F1F5F9', fontSize: 15, fontWeight: '700' },
  opGain: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  opPersonal: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#334155',
  },
  opPersonalText: { color: '#CBD5E1', fontSize: 12, flex: 1 },
  opPersonalBold: { color: '#10B981', fontWeight: '700' },

  ctaBox: {
    backgroundColor: '#1E293B', borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#334155', marginTop: 8,
  },
  ctaTitle: { color: '#F1F5F9', fontSize: 17, fontWeight: '700' },
  ctaSub: {
    color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 18,
  },
  ctaBtn: { borderRadius: 10, overflow: 'hidden', marginTop: 6, width: '100%' },
  ctaBtnGradient: { paddingVertical: 13, alignItems: 'center' },
  ctaBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

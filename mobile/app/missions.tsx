import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMissions, useClaimMission, Mission } from '../src/hooks/useMissions';

/**
 * Missões — desafios opcionais que dão dias Premium grátis quando
 * completados. Foco em crowdsource (reports) e retenção (saldo, refer).
 *
 * Layout: lista com progress bar, sela de status, botão "Resgatar" quando
 * disponível.
 */
export default function MissionsScreen() {
  const { data, isLoading, isRefetching, refetch } = useMissions();
  const claim = useClaimMission();

  const handleClaim = async (m: Mission) => {
    try {
      const res = await claim.mutateAsync(m.id);
      Alert.alert(
        '🎉 Recompensa resgatada!',
        `Você ganhou ${res.rewardDays} dias Premium. Aproveite as oportunidades desbloqueadas!`,
      );
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.message || 'Falha ao resgatar');
    }
  };

  const iconFor = (targetType: string) => {
    switch (targetType) {
      case 'bonus_reports_approved':
        return 'megaphone';
      case 'balance_programs_added':
        return 'wallet';
      case 'referrals_applied':
        return 'people';
      default:
        return 'trophy';
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.titleBox}>
          <Text style={styles.title}>Missões</Text>
          <Text style={styles.subtitle}>Ganhe dias Premium grátis</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#8B5CF6" />}
      >
        {isLoading && <ActivityIndicator color="#8B5CF6" style={{ marginTop: 40 }} />}

        {!isLoading && data?.missions?.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="trophy-outline" size={48} color="#475569" />
            <Text style={styles.emptyText}>Nenhuma missão ativa no momento.</Text>
          </View>
        )}

        {data?.missions?.map((m) => {
          const percent = Math.min(100, (m.progress / m.targetCount) * 100);
          const canClaim = !m.claimed && m.progress >= m.targetCount;
          const isCompleted = m.claimed;

          return (
            <View
              key={m.id}
              style={[
                styles.card,
                isCompleted && styles.cardCompleted,
                canClaim && styles.cardReady,
              ]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.icon,
                    canClaim && { backgroundColor: '#F59E0B33' },
                    isCompleted && { backgroundColor: '#10B98133' },
                  ]}
                >
                  <Ionicons
                    name={iconFor(m.targetType) as any}
                    size={22}
                    color={isCompleted ? '#10B981' : canClaim ? '#F59E0B' : '#A78BFA'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{m.title}</Text>
                  <Text style={styles.cardDesc}>{m.description}</Text>
                </View>
                <View style={styles.reward}>
                  <Text style={styles.rewardValue}>+{m.rewardDays}d</Text>
                  <Text style={styles.rewardLabel}>Premium</Text>
                </View>
              </View>

              {!isCompleted && (
                <>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressText}>
                      Progresso: {m.progress}/{m.targetCount}
                    </Text>
                    <Text style={styles.progressPercent}>{percent.toFixed(0)}%</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${percent}%`, backgroundColor: canClaim ? '#F59E0B' : '#8B5CF6' },
                      ]}
                    />
                  </View>
                </>
              )}

              {canClaim && (
                <TouchableOpacity
                  onPress={() => handleClaim(m)}
                  disabled={claim.isPending}
                  style={[styles.claimBtn, claim.isPending && { opacity: 0.5 }]}
                >
                  <LinearGradient
                    colors={['#F59E0B', '#F97316']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.claimGradient}
                  >
                    {claim.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="gift" size={16} color="#fff" />
                        <Text style={styles.claimText}>Resgatar {m.rewardDays}d Premium</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {isCompleted && (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.completedText}>
                    Resgatado{' '}
                    {m.rewardClaimedAt &&
                      new Date(m.rewardClaimedAt).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.tipBox}>
          <Ionicons name="information-circle" size={16} color="#A78BFA" />
          <Text style={styles.tipText}>
            Progresso é contado desde o início de cada missão. Missões novas aparecem aqui automaticamente.
          </Text>
        </View>
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
  empty: { alignItems: 'center', gap: 10, marginTop: 40 },
  emptyText: { color: '#94A3B8', fontSize: 13 },

  card: {
    padding: 16, borderRadius: 12,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
    marginBottom: 12,
  },
  cardReady: { borderColor: '#F59E0B' },
  cardCompleted: { opacity: 0.7 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  icon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#3B2F66',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { color: '#F1F5F9', fontSize: 15, fontWeight: '700' },
  cardDesc: { color: '#94A3B8', fontSize: 12, marginTop: 4, lineHeight: 16 },
  reward: { alignItems: 'flex-end' },
  rewardValue: { color: '#F59E0B', fontSize: 20, fontWeight: '800' },
  rewardLabel: { color: '#64748B', fontSize: 10, fontWeight: '600', marginTop: 2 },

  progressRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: { color: '#CBD5E1', fontSize: 12 },
  progressPercent: { color: '#A78BFA', fontSize: 12, fontWeight: '700' },
  progressBar: { height: 8, borderRadius: 4, backgroundColor: '#0F172A', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  claimBtn: { marginTop: 12, borderRadius: 10, overflow: 'hidden' },
  claimGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12,
  },
  claimText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  completedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: '#334155',
  },
  completedText: { color: '#10B981', fontSize: 12, fontWeight: '600' },

  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, marginTop: 12,
    borderRadius: 10, backgroundColor: '#1E293B',
    borderWidth: 1, borderColor: '#334155',
  },
  tipText: { color: '#94A3B8', fontSize: 11, flex: 1, lineHeight: 15 },
});

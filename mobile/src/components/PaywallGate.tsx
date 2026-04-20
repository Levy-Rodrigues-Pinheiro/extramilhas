import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { track } from '../lib/analytics';
import { useActivateTrial } from '../hooks/useSubscription';
import { haptic } from '../lib/haptic';

/**
 * Banner persuasivo mostrado abaixo das oportunidades visíveis quando há
 * conteúdo bloqueado pelo plano atual.
 *
 * Desenho: alta densidade visual (gradient), número concreto ("+12 ocultas"),
 * benefício claro, CTA singular pra /subscription.
 */
export function PaywallUpsellBanner({ lockedCount }: { lockedCount: number }) {
  const trial = useActivateTrial();

  React.useEffect(() => {
    if (lockedCount > 0) {
      track('paywall_shown', { lockedCount, surface: 'arbitrage_banner' });
    }
  }, [lockedCount]);

  if (lockedCount <= 0) return null;

  const handleUpgrade = () => {
    track('paywall_upgrade_clicked', { lockedCount });
    router.push('/subscription');
  };

  const handleStartTrial = async () => {
    try {
      haptic.tap();
      const res = await trial.mutateAsync();
      haptic.success();
      track('trial_activated', { lockedCount });
      Alert.alert(
        '🎉 Trial ativado!',
        `7 dias de Premium grátis. Expira em ${new Date(res.expiresAt).toLocaleDateString('pt-BR')}. Sem cobrança — você decide se quer continuar depois.`,
      );
    } catch (err: any) {
      haptic.error();
      Alert.alert(
        'Não foi possível',
        err?.response?.data?.message ||
          'Você já usou seu trial. Assine Premium pra continuar desbloqueando.',
      );
    }
  };

  return (
    <View style={styles.outer}>
      {/* CTA principal: trial 7d grátis (soft paywall) */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleStartTrial}
        disabled={trial.isPending}
        accessibilityLabel="Ativar trial Premium 7 dias grátis"
        accessibilityRole="button"
      >
      <LinearGradient
        colors={['#F59E0B', '#F97316']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bannerInner}
      >
        <View style={styles.iconBox}>
          {trial.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="gift" size={24} color="#fff" />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>🎁 Experimente 7 dias grátis</Text>
          <Text style={styles.sub}>
            Desbloqueie +{lockedCount} oportunidade{lockedCount !== 1 ? 's' : ''} + alertas
            ilimitados. Sem cobrança, sem cartão.
          </Text>
        </View>
        <View style={styles.arrow}>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </View>
      </LinearGradient>
    </TouchableOpacity>

    {/* Link secundário: quem já usou trial ou quer pagar direto */}
    <TouchableOpacity onPress={handleUpgrade} style={styles.secondaryLink}>
      <Text style={styles.secondaryText}>
        Já usou o trial? Ver planos Premium →
      </Text>
    </TouchableOpacity>
  </View>
  );
}

/**
 * Card "preview" de uma oportunidade bloqueada — mostra shape genérico
 * (sem valores reais) + ícone de cadeado. Induz curiosidade.
 */
export function LockedOpportunityCard({ index }: { index: number }) {
  return (
    <View style={styles.lockedCard}>
      <View style={styles.lockedOverlay}>
        <Ionicons name="lock-closed" size={22} color="#A78BFA" />
        <Text style={styles.lockedText}>Oferta exclusiva Premium</Text>
      </View>
      <View style={styles.lockedHeader}>
        <View style={styles.lockedBadge}>
          <Text style={styles.lockedBadgeText}>⚡ BOA</Text>
        </View>
        <Text style={styles.lockedBonus}>+{50 + ((index * 17) % 50)}%</Text>
      </View>
      <Text style={styles.lockedTitle}>••••••• → •••••••</Text>
      <Text style={styles.lockedSub}>Ganho de ••,•% em valor</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { marginBottom: 12 },
  secondaryLink: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '600',
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  iconBox: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 15, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2, lineHeight: 16 },
  arrow: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  lockedCard: {
    padding: 14,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
    opacity: 0.6,
    position: 'relative',
    overflow: 'hidden',
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center', justifyContent: 'center',
    gap: 6,
    zIndex: 2,
  },
  lockedText: { color: '#A78BFA', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  lockedHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 6,
  },
  lockedBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#F59E0B25',
    borderWidth: 1, borderColor: '#F59E0B',
  },
  lockedBadgeText: { color: '#F59E0B', fontSize: 10, fontWeight: '700' },
  lockedBonus: { color: '#F1F5F9', fontSize: 18, fontWeight: '800' },
  lockedTitle: { color: '#64748B', fontSize: 14, fontWeight: '600', letterSpacing: 2 },
  lockedSub: { color: '#475569', fontSize: 12, marginTop: 4 },
});

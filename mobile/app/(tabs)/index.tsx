import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useTransferBonuses } from '../../src/hooks/useArbitrage';
import { useWallet } from '../../src/hooks/useWallet';
import { useMyLeaderboardStats, TIER_META } from '../../src/hooks/useLeaderboard';
import { PaywallUpsellBanner } from '../../src/components/PaywallGate';
import { useMissions } from '../../src/hooks/useMissions';
import { FirstRunTip } from '../../src/components/FirstRunTip';
import { OnboardingTour } from '../../src/components/OnboardingTour';
import { useNotificationFeed } from '../../src/hooks/useNotificationFeed';
import { usePingStreak, useStreak } from '../../src/hooks/useEngagement';
import { useTranslation } from 'react-i18next';
import {
  AuroraBackground,
  GlassCard,
  PressableScale,
  AnimatedNumber,
  StaggerItem,
  ConfettiBurst,
  ShimmerSkeleton,
  EmptyStateIllustrated,
  LiveActivityBanner,
  TiltCard3D,
  SymbolEffect,
  type ConfettiBurstHandle,
  aurora,
  premium,
  semantic,
  surface,
  text as textTokens,
  space,
  gradients,
  motion,
  haptics,
} from '../../src/components/primitives';

/**
 * Home v2 — Aurora design system.
 *
 * Hierarquia visual:
 *  1. Aurora background (mesh gradient animado, subtle)
 *  2. Header: greeting + notifs + profile
 *  3. Hero: wallet value (AnimatedNumber roll-up) + streak ring pulsing
 *  4. Quick actions (3 tiles com stagger)
 *  5. Mission ready-to-claim (gold glow, burst no press)
 *  6. Top oportunidades (stagger, glow proportional to gain)
 *  7. Leaderboard tier card (holographic)
 */
export default function HomeScreen() {
  const wallet = useWallet();
  const bonuses = useTransferBonuses();
  const leaderboard = useMyLeaderboardStats();
  const missions = useMissions();
  const notifFeed = useNotificationFeed();
  const notifUnread = notifFeed.data?.unreadCount ?? 0;
  const { t } = useTranslation();
  const streak = useStreak();
  const pingStreak = usePingStreak();
  const confettiRef = useRef<ConfettiBurstHandle>(null);

  useEffect(() => {
    pingStreak.mutate(undefined, {
      onSuccess: (data) => {
        if (data?.reward) {
          const r = data.reward;
          // Confetti + haptic + alert (já tinha alert, upgrade com confetti)
          confettiRef.current?.burst();
          Alert.alert(
            `🏆 Streak de ${r.daysReached} dias!`,
            `Parabéns! Você ganhou ${r.premiumDaysGranted} dia${r.premiumDaysGranted > 1 ? 's' : ''} de Premium grátis.`,
            [{ text: 'Show!', style: 'default' }],
          );
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nearCompletion = React.useMemo(() => {
    const list = missions.data?.missions ?? [];
    return list
      .filter((m) => !m.claimed && m.progress / m.targetCount >= 0.5 && m.progress < m.targetCount)
      .sort((a, b) => b.progress / b.targetCount - a.progress / a.targetCount)[0];
  }, [missions.data]);

  const readyToClaim = React.useMemo(() => {
    const list = missions.data?.missions ?? [];
    return list.find((m) => !m.claimed && m.progress >= m.targetCount);
  }, [missions.data]);

  const refreshing = wallet.isRefetching || bonuses.isRefetching;
  const refetchAll = () => {
    haptics.medium();
    wallet.refetch();
    bonuses.refetch();
  };

  const totalValue = wallet.data?.summary.totalValueBrl ?? 0;
  const programsCount = wallet.data?.summary.programsCount ?? 0;
  const topOpportunities = (bonuses.data?.opportunities || [])
    .filter((o) => o.classification !== 'NORMAL')
    .slice(0, 3);

  // Dynamic Island banner: só aparece quando tem um IMPERDIVEL ativo
  const hotDeal = React.useMemo(
    () => (bonuses.data?.opportunities || []).find((o) => o.classification === 'IMPERDIVEL'),
    [bonuses.data],
  );
  const [bannerDismissed, setBannerDismissed] = React.useState(false);
  const showLiveBanner = !!hotDeal && !bannerDismissed;

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <OnboardingTour />
        <ConfettiBurst ref={confettiRef} />

        {/* 🔥 Live Activity Banner (Dynamic Island-style) */}
        <LiveActivityBanner
          visible={showLiveBanner}
          icon="flame"
          title={`Bônus imperdível · +${hotDeal?.currentBonus.toFixed(0) ?? 0}%`}
          subtitle={
            hotDeal ? `${hotDeal.fromProgram.name} → ${hotDeal.toProgram.name}` : undefined
          }
          accent="aurora"
          onPress={() => router.push('/arbitrage' as any)}
          onDismiss={() => setBannerDismissed(true)}
        />

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refetchAll}
              tintColor={aurora.cyan}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <FirstRunTip
            tipKey="home-intro-v1"
            title="Seu dashboard de arbitragem"
            body="Cadastre saldos pra ver quanto VOCÊ ganha em R$ em cada oportunidade. Perfil → Saldo de Milhas."
            icon="bulb"
          />

          {/* ─── Header ──────────────────────────────────── */}
          <Animated.View
            entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
            style={styles.header}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{t('home.greeting')}</Text>
              <Text style={styles.subtitle}>{t('home.subtitle')}</Text>

              {streak.data && (streak.data.currentStreak ?? 0) > 1 && (
                <StreakChip streak={streak.data.currentStreak ?? 0} />
              )}
            </View>

            <View style={styles.iconsRight}>
              <PressableScale
                onPress={() => router.push('/notifications-feed' as any)}
                haptic="tap"
                accessibilityRole="button"
                accessibilityLabel={
                  notifUnread > 0
                    ? `${notifUnread} notificações não lidas`
                    : 'Caixa de notificações'
                }
                hitSlop={6}
              >
                <View style={styles.iconBtn}>
                  <Ionicons
                    name="notifications"
                    size={20}
                    color={notifUnread > 0 ? aurora.cyan : textTokens.secondary}
                  />
                  {notifUnread > 0 && (
                    <View style={styles.iconBadge}>
                      <Text style={styles.iconBadgeText}>
                        {notifUnread > 9 ? '9+' : notifUnread}
                      </Text>
                    </View>
                  )}
                </View>
              </PressableScale>

              <PressableScale
                onPress={() => router.push('/(tabs)/profile')}
                haptic="tap"
                accessibilityRole="button"
                accessibilityLabel="Abrir meu perfil"
                hitSlop={6}
              >
                <View style={styles.iconBtn}>
                  <Ionicons name="person" size={20} color={aurora.iris} />
                </View>
              </PressableScale>
            </View>
          </Animated.View>

          {/* ─── Hero: Wallet value (3D Tilt card — drag finger to tilt) ── */}
          <Animated.View
            entering={FadeInDown.delay(60).duration(motion.timing.medium).springify().damping(20)}
          >
            <TiltCard3D tiltIntensity={6} style={{ marginBottom: space.lg }}>
              <PressableScale
                onPress={() => router.push('/(tabs)/wallet' as any)}
                haptic="tap"
                pressedScale={0.995}
              >
                <View style={[styles.hero, { marginBottom: 0 }]}>
                {/* Gradient layer */}
                <LinearGradient
                  colors={gradients.aurora}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFill, styles.heroBg]}
                />
                {/* Darken overlay pra aumentar contraste do valor */}
                <LinearGradient
                  colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.45)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {/* Sheen */}
                <LinearGradient
                  colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={[StyleSheet.absoluteFill, { height: '50%' }]}
                />

                <View style={styles.heroContent}>
                  <View style={styles.heroTop}>
                    <Text style={styles.heroLabel}>{t('home.wallet_label')}</Text>
                    <View style={styles.heroChevronWrap}>
                      <Ionicons name="chevron-forward" size={18} color="#FFF" />
                    </View>
                  </View>

                  {wallet.isLoading ? (
                    <View style={{ marginTop: 14 }}>
                      <ShimmerSkeleton height={40} width="70%" radius="sm" />
                    </View>
                  ) : (
                    <View style={styles.heroValueRow}>
                      <AnimatedNumber
                        value={totalValue}
                        format="currency"
                        style={styles.heroValue}
                        hapticOnChange={false}
                      />
                    </View>
                  )}

                  <Text style={styles.heroSub}>
                    {programsCount === 0
                      ? '✨ Cadastre seus saldos pra personalizar'
                      : `${programsCount} programa${programsCount !== 1 ? 's' : ''} ativos`}
                  </Text>
                </View>
              </View>
              </PressableScale>
            </TiltCard3D>
          </Animated.View>

          {/* ─── Quick actions ───────────────────────────── */}
          <View style={styles.quickRow}>
            {[
              {
                icon: 'calculator' as const,
                label: t('home.quick_calc'),
                color: semantic.success,
                glow: 'success' as const,
                onPress: () => router.push('/(tabs)/calculator' as any),
              },
              {
                icon: 'trending-up' as const,
                label: t('home.quick_opportunities'),
                color: premium.goldLight,
                glow: 'gold' as const,
                badge: topOpportunities.length,
                onPress: () => router.push('/arbitrage' as any),
              },
              {
                icon: 'notifications' as const,
                label: t('home.quick_alerts'),
                color: aurora.cyan,
                glow: 'cyan' as const,
                onPress: () => router.push('/(tabs)/alerts'),
              },
            ].map((q, i) => (
              <StaggerItem key={q.label} index={i} baseDelay={120}>
                <QuickAction {...q} />
              </StaggerItem>
            ))}
          </View>

          {/* ─── Mission ready (gold glow) ────────────────── */}
          {readyToClaim && (
            <Animated.View
              entering={FadeIn.duration(motion.timing.medium)}
              style={{ marginBottom: space.md }}
            >
              <PressableScale
                onPress={() => {
                  confettiRef.current?.burst();
                  router.push('/missions' as any);
                }}
                haptic="success"
              >
                <LinearGradient
                  colors={gradients.premium}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.missionReady}
                >
                  <View style={styles.missionReadyIcon}>
                    <Ionicons name="gift" size={22} color={textTokens.onGold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.missionReadyTitle}>
                      🎉 Missão completa: {readyToClaim.title}
                    </Text>
                    <Text style={styles.missionReadySub}>
                      Toque pra resgatar +{readyToClaim.rewardDays}d Premium
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={textTokens.onGold} />
                </LinearGradient>
              </PressableScale>
            </Animated.View>
          )}

          {/* ─── Mission in-progress nudge ───────────────── */}
          {!readyToClaim && nearCompletion && (
            <Animated.View
              entering={FadeIn.duration(motion.timing.medium)}
              style={{ marginBottom: space.md }}
            >
              <PressableScale onPress={() => router.push('/missions' as any)} haptic="tap">
                <GlassCard radiusSize="md" padding={14} glow="aurora" style={styles.missionNudge}>
                  <View style={styles.missionNudgeIcon}>
                    <Ionicons name="trophy" size={18} color={aurora.iris} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.missionNudgeTitle}>{nearCompletion.title}</Text>
                    <Text style={styles.missionNudgeSub}>
                      {nearCompletion.progress}/{nearCompletion.targetCount} · faltam{' '}
                      {nearCompletion.targetCount - nearCompletion.progress} pra{' '}
                      +{nearCompletion.rewardDays}d Premium
                    </Text>
                    {/* Progress bar */}
                    <View style={styles.progressTrack}>
                      <LinearGradient
                        colors={gradients.auroraCyanMagenta}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(
                              100,
                              (nearCompletion.progress / nearCompletion.targetCount) * 100,
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={textTokens.muted} />
                </GlassCard>
              </PressableScale>
            </Animated.View>
          )}

          {/* ─── Leaderboard tier card (holographic) ─────── */}
          {leaderboard.data && leaderboard.data.approvedCount > 0 && (
            <StaggerItem index={0} baseDelay={240}>
              <PressableScale onPress={() => router.push('/leaderboard' as any)} haptic="tap">
                <GlassCard
                  radiusSize="lg"
                  padding={16}
                  glow={
                    leaderboard.data.tier === 'PLATINUM'
                      ? 'cyan'
                      : leaderboard.data.tier === 'GOLD'
                      ? 'gold'
                      : 'none'
                  }
                  style={styles.tierCard}
                >
                  <Text style={styles.tierEmoji}>
                    {TIER_META[leaderboard.data.tier].emoji}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tierTitle}>
                      Você é tier {TIER_META[leaderboard.data.tier].label}
                    </Text>
                    <Text style={styles.tierSub}>
                      {leaderboard.data.approvedCount} report
                      {leaderboard.data.approvedCount !== 1 ? 's' : ''} aprovado
                      {leaderboard.data.approvedCount !== 1 ? 's' : ''}
                      {leaderboard.data.rank !== null && ` · #${leaderboard.data.rank}`}
                    </Text>
                    {leaderboard.data.nextTier && (
                      <Text style={styles.tierNext}>
                        ⬆ faltam {leaderboard.data.nextTier.needed} pra{' '}
                        {TIER_META[leaderboard.data.nextTier.name].label}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={textTokens.muted} />
                </GlassCard>
              </PressableScale>
            </StaggerItem>
          )}

          {/* ─── Top oportunidades ───────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.flameIcon}>
                  <Ionicons name="flame" size={14} color={premium.goldLight} />
                </View>
                <Text style={styles.sectionTitle}>Bônus ativos agora</Text>
              </View>
              <PressableScale
                onPress={() => router.push('/arbitrage' as any)}
                haptic="select"
                style={styles.sectionLinkWrap}
              >
                <Text style={styles.sectionLink}>Ver todos</Text>
                <Ionicons name="chevron-forward" size={14} color={aurora.cyan} />
              </PressableScale>
            </View>

            {bonuses.isLoading && (
              <View style={{ gap: 12 }}>
                <ShimmerSkeleton height={112} radius="lg" />
                <ShimmerSkeleton height={112} radius="lg" />
              </View>
            )}

            {!bonuses.isLoading && topOpportunities.length === 0 && (
              <GlassCard radiusSize="lg" padding={0} style={{ overflow: 'hidden' }}>
                <EmptyStateIllustrated
                  variant="radar"
                  title="Sem bônus agora"
                  description="Te avisamos por push quando aparecer um bônus de transferência que vale."
                />
              </GlassCard>
            )}

            {bonuses.data?.shouldUpsell && bonuses.data.lockedCount && bonuses.data.lockedCount > 0 ? (
              <PaywallUpsellBanner lockedCount={bonuses.data.lockedCount} />
            ) : null}

            {topOpportunities.map((op, i) => (
              <StaggerItem key={op.id} index={i} baseDelay={300}>
                <PressableScale
                  onPress={() => router.push('/arbitrage' as any)}
                  haptic="tap"
                >
                  <GlassCard
                    radiusSize="lg"
                    padding={16}
                    glow={op.classification === 'IMPERDIVEL' ? 'gold' : 'none'}
                    style={{ marginBottom: space.sm }}
                  >
                    <View style={styles.opCardHeader}>
                      <View
                        style={[
                          styles.opBadge,
                          {
                            backgroundColor:
                              op.classification === 'IMPERDIVEL'
                                ? premium.goldSoft
                                : semantic.successBg,
                            borderColor:
                              op.classification === 'IMPERDIVEL'
                                ? premium.gold
                                : semantic.success,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.opBadgeText,
                            {
                              color:
                                op.classification === 'IMPERDIVEL'
                                  ? premium.goldLight
                                  : semantic.success,
                            },
                          ]}
                        >
                          {op.classification === 'IMPERDIVEL' ? '🔥 IMPERDÍVEL' : '⚡ BOA'}
                        </Text>
                      </View>
                      <View style={styles.opBonusWrap}>
                        <Text style={styles.opBonusPlus}>+</Text>
                        <Text style={styles.opBonus}>{op.currentBonus.toFixed(0)}</Text>
                        <Text style={styles.opBonusPct}>%</Text>
                      </View>
                    </View>

                    <Text style={styles.opTitle}>
                      {op.fromProgram.name} → {op.toProgram.name}
                    </Text>
                    <Text style={styles.opGain}>
                      Ganho de {op.gainPercent.toFixed(1)}% em valor
                    </Text>

                    {op.userSourceBalance != null && op.potentialValueGain != null && (
                      <View style={styles.opPersonal}>
                        <View style={styles.opPersonalDot}>
                          <Ionicons name="wallet" size={11} color={semantic.success} />
                        </View>
                        <Text style={styles.opPersonalText}>
                          Você ganha{' '}
                          <Text style={styles.opPersonalBold}>
                            R$ {op.potentialValueGain.toFixed(2)}
                          </Text>{' '}
                          com seu saldo
                        </Text>
                      </View>
                    )}
                  </GlassCard>
                </PressableScale>
              </StaggerItem>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── StreakChip: badge com flame pulsing ──────────────────────────────

function StreakChip({ streak: currentStreak }: { streak: number }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <PressableScale
      onPress={() => router.push('/goals' as any)}
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel={`Streak de ${currentStreak} dias consecutivos`}
    >
      <View style={streakStyles.badge}>
        <Animated.Text style={[streakStyles.emoji, style]}>🔥</Animated.Text>
        <Text style={streakStyles.text}>{currentStreak}d streak</Text>
      </View>
    </PressableScale>
  );
}

// ─── QuickAction ──────────────────────────────────────────────────────

function QuickAction({
  icon,
  label,
  color,
  glow,
  badge,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  glow: 'cyan' | 'magenta' | 'gold' | 'success' | 'none';
  badge?: number;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress} haptic="tap" style={{ flex: 1 }}>
      <View style={styles.quickAction}>
        <GlassCard
          glow={glow}
          radiusSize="md"
          padding={0}
          style={styles.quickIcon}
        >
          <Ionicons name={icon} size={24} color={color} />
          {badge != null && badge > 0 && (
            <View style={styles.quickBadge}>
              <Text style={styles.quickBadgeText}>{badge}</Text>
            </View>
          )}
        </GlassCard>
        <Text style={styles.quickLabel}>{label}</Text>
      </View>
    </PressableScale>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const streakStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: premium.goldSoft,
    borderWidth: 1,
    borderColor: `${premium.gold}60`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  emoji: { fontSize: 13 },
  text: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: premium.goldLight,
    letterSpacing: 0.3,
  },
});

const styles = StyleSheet.create({
  content: {
    padding: space.md,
    paddingBottom: 120,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space.lg,
  },
  greeting: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginTop: 2,
  },
  iconsRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: surface.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: surface.glassBorder,
    position: 'relative',
  },
  iconBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: aurora.magenta,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0A1020',
    shadowColor: aurora.magenta,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 4,
  },
  iconBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
  },

  // Hero
  hero: {
    borderRadius: 24,
    padding: space.xl,
    overflow: 'hidden',
    minHeight: 150,
    marginBottom: space.lg,
    shadowColor: aurora.magenta,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  heroBg: {
    borderRadius: 24,
  },
  heroContent: {
    zIndex: 1,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    textTransform: 'uppercase',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
  },
  heroChevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  heroValue: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1.4,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    marginTop: 6,
  },

  // Quick actions
  quickRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: space.lg,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickIcon: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  quickBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: aurora.magenta,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: aurora.magenta,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  quickBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
  },
  quickLabel: {
    color: textTokens.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    marginTop: 8,
  },

  // Mission ready (gold)
  missionReady: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    shadowColor: premium.goldLight,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  missionReadyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionReadyTitle: {
    color: textTokens.onGold,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  missionReadySub: {
    color: 'rgba(30,18,2,0.7)',
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginTop: 2,
  },

  // Mission nudge
  missionNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  missionNudgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(129, 140, 248, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionNudgeTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  missionNudgeSub: {
    color: textTokens.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  progressTrack: {
    marginTop: 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Tier card
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: space.md,
  },
  tierEmoji: {
    fontSize: 36,
  },
  tierTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  tierSub: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginTop: 2,
  },
  tierNext: {
    color: aurora.cyan,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 0.2,
  },

  // Section
  section: {
    marginTop: space.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flameIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: premium.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  sectionLinkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  sectionLink: {
    color: aurora.cyan,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },

  // Op card
  opCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  opBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  opBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.6,
  },
  opBonusWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  opBonusPlus: {
    color: premium.goldLight,
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  opBonus: {
    color: premium.goldLight,
    fontFamily: 'Inter_900Black',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.6,
  },
  opBonusPct: {
    color: premium.goldLight,
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    marginLeft: 1,
  },
  opTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    marginTop: 2,
  },
  opGain: {
    color: textTokens.secondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginTop: 4,
  },
  opPersonal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: surface.glassBorder,
  },
  opPersonalDot: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: semantic.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opPersonalText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    flex: 1,
  },
  opPersonalBold: {
    color: semantic.success,
    fontFamily: 'Inter_700Bold',
  },
});

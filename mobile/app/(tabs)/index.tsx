/**
 * Home — redesign do zero seguindo Apple HIG + Aurora UI.
 *
 * REFERÊNCIAS DA SKILL apple-style-app-design APLICADAS:
 *  - ref 02 (typography): Large Title 34pt + serif italic accent na palavra-chave
 *  - ref 04 (spacing): escala 4px, padding seções 24-32, gap consistente
 *  - ref 12 (ios-patterns): Large title editorial, glass nav compact-on-scroll,
 *                          safe areas, section headers com "Ver todos →"
 *  - ref 15 (landing): hero principal com depth + visual focal claro
 *  - ref 21 (data viz): Sparkline minimal sem grid, ActivityRing com gradient,
 *                       cores semânticas (verde positivo / vermelho negativo)
 *  - ref 24 (compositions): Bento 2x2 stat blocks, horizontal scroll cards
 *
 * ESTRUTURA VISUAL:
 *
 *  ┌──────────────────────────────────────────────┐
 *  │ Glass nav (compact on scroll, sticky top)    │
 *  ├──────────────────────────────────────────────┤
 *  │                                              │
 *  │   Bom dia,                                   │  ← Large Title 34pt
 *  │   *Levy*.                                    │  ← serif italic accent
 *  │   Suas milhas, sempre prontas.               │  ← subtitle dim
 *  │                                              │
 *  │   ┌─────── Hero Wallet Card ──────────┐    │
 *  │   │ Saldo total       [↑ 18%]          │    │  ← DeltaChip
 *  │   │ R$ 12.430,00                       │    │  ← AnimatedNumber
 *  │   │   ╱╲      ╱╲╱╲                     │    │  ← Sparkline 7d
 *  │   │ ╱   ╲    ╱       ╲                 │    │
 *  │   │ 3 programas         →              │    │
 *  │   └────────────────────────────────────┘    │
 *  │                                              │
 *  │   ┌─────── Bento 2x2 Stats ──────────┐     │  ← BentoGrid
 *  │   │ Streak    │ Tier                 │     │
 *  │   │   7 dias  │   Gold #12           │     │
 *  │   │ ──────────┼──────────             │     │
 *  │   │ Missões   │ Hoje                 │     │
 *  │   │   3/7     │   2 ofertas          │     │
 *  │   └────────────────────────────────────┘    │
 *  │                                              │
 *  │   Hoje    Ver todas →                       │  ← SectionHeader
 *  │                                              │
 *  │   [Mission ready card — gold glow]           │  ← se há missão pronta
 *  │                                              │
 *  │   Oportunidades   Ver todas →                │  ← SectionHeader
 *  │   ┌──────┐┌──────┐┌──────┐                  │  ← Horizontal scroll
 *  │   │ +120%││ +85% ││ +60% │                   │
 *  │   │ S→L  ││ T→S  ││ A→S  │                   │
 *  │   └──────┘└──────┘└──────┘                   │
 *  │                                              │
 *  │   Sua semana                                 │  ← SectionHeader
 *  │   ┌── Activity Ring + missões status ─┐     │
 *  │   │   ◯ 5/7 dias                       │     │
 *  │   │   "Você está no caminho."          │     │
 *  │   └────────────────────────────────────┘    │
 *  │                                              │
 *  │   (footer space)                             │
 *  └──────────────────────────────────────────────┘
 *
 * SIGNATURE MOMENTS:
 *  1. Large title "Bom dia, *Levy*." com serif italic
 *  2. Hero wallet AnimatedNumber roll-up + Sparkline desenhando 1.1s
 *  3. Bento 2x2 stat blocks com glass + ícone gradient quadrado
 *  4. Horizontal scroll oportunidades com snap + paged
 *  5. Activity Ring "sua semana" Apple Health-style
 *  6. Stagger entrance ao mount: header → hero → bento → mission → opps → ring
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
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
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import { useTransferBonuses } from '../../src/hooks/useArbitrage';
import { useWallet } from '../../src/hooks/useWallet';
import { useMyLeaderboardStats, TIER_META } from '../../src/hooks/useLeaderboard';
import { useMissions } from '../../src/hooks/useMissions';
import { useNotificationFeed } from '../../src/hooks/useNotificationFeed';
import { usePingStreak, useStreak } from '../../src/hooks/useEngagement';
import { OnboardingTour } from '../../src/components/OnboardingTour';
import { FirstRunTip } from '../../src/components/FirstRunTip';
import {
  AuroraBackground,
  GlassCard,
  PressableScale,
  AnimatedNumber,
  ConfettiBurst,
  ShimmerSkeleton,
  LiveActivityBanner,
  ActivityRings,
  Sparkline,
  DeltaChip,
  SectionHeader,
  GradientText,
  SerifItalic,
  type ConfettiBurstHandle,
  aurora,
  premium,
  semantic,
  surface,
  text as textTokens,
  space,
  haptics,
} from '../../src/components/primitives';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Greeting helper (depende do horário) ──────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// ═════════════════════════════════════════════════════════════════════
// HOME SCREEN
// ═════════════════════════════════════════════════════════════════════

export default function HomeScreen() {
  const wallet = useWallet();
  const bonuses = useTransferBonuses();
  const leaderboard = useMyLeaderboardStats();
  const missions = useMissions();
  const notifFeed = useNotificationFeed();
  const streak = useStreak();
  const pingStreak = usePingStreak();
  const confettiRef = useRef<ConfettiBurstHandle>(null);

  // First name pra title (fallback)
  const firstName = (wallet.data as any)?.user?.name?.split(' ')?.[0] ?? 'você';

  // Streak ping silencioso ao mount + reward popup
  useEffect(() => {
    pingStreak.mutate(undefined, {
      onSuccess: (data) => {
        if (data?.reward) {
          const r = data.reward;
          confettiRef.current?.burst();
          Alert.alert(
            `Streak de ${r.daysReached} dias`,
            `Parabéns! Você ganhou ${r.premiumDaysGranted} dia${r.premiumDaysGranted > 1 ? 's' : ''} de Premium grátis.`,
            [{ text: 'Show!', style: 'default' }],
          );
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll-driven glass nav (compact on scroll)
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const glassNavStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [60, 120], [0, 1], Extrapolation.CLAMP),
  }));

  const largeTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 80], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, 100],
          [0, -20],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // Derived data
  const totalValue = wallet.data?.summary.totalValueBrl ?? 0;
  const programsCount = wallet.data?.summary.programsCount ?? 0;
  const notifUnread = notifFeed.data?.unreadCount ?? 0;
  const currentStreak = streak.data?.currentStreak ?? 0;
  const userTier = (leaderboard.data as any)?.tier as keyof typeof TIER_META | undefined;
  const userRank = (leaderboard.data as any)?.rank ?? null;
  const tierMeta = userTier ? TIER_META[userTier] : null;

  // Missões metrics
  const missionsList = missions.data?.missions ?? [];
  const completedMissions = missionsList.filter((m) => m.claimed).length;
  const totalMissions = missionsList.length || 7; // fallback
  const readyToClaim = missionsList.find(
    (m) => !m.claimed && m.progress >= m.targetCount,
  );

  // Oportunidades (top 5 com bônus ativo, ordenado por gain)
  const topOpportunities = useMemo(
    () =>
      (bonuses.data?.opportunities || [])
        .filter((o) => o.classification !== 'NORMAL')
        .slice(0, 5),
    [bonuses.data],
  );

  // Hot deal (Live Activity banner)
  const hotDeal = useMemo(
    () =>
      (bonuses.data?.opportunities || []).find(
        (o) => o.classification === 'IMPERDIVEL',
      ),
    [bonuses.data],
  );
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Sparkline data (7 dias) — mock por enquanto, idealmente vem do backend
  const sparkData = useMemo(() => {
    if (!totalValue) return [0, 0, 0, 0, 0, 0, 0];
    // Mock crescente com leve variação
    const base = totalValue * 0.85;
    return Array.from({ length: 7 }, (_, i) => {
      const noise = (Math.sin(i * 1.7) + Math.cos(i * 2.3)) * 0.04;
      return Math.round(base + (totalValue - base) * (i / 6) * (1 + noise));
    });
  }, [totalValue]);

  const weekDelta = sparkData[6] - sparkData[0];
  const weekDeltaPct = sparkData[0] ? (weekDelta / sparkData[0]) * 100 : 0;

  // Activity ring — quantos dias da semana o user esteve ativo (mock = streak%7)
  const weekActivity = Math.min(currentStreak, 7);
  const weekProgress = weekActivity / 7;

  const refreshing = wallet.isRefetching || bonuses.isRefetching;
  const refetchAll = () => {
    haptics.medium();
    wallet.refetch();
    bonuses.refetch();
    missions.refetch?.();
  };

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <OnboardingTour />
        <ConfettiBurst ref={confettiRef} />

        {/* ─── Glass nav compact (aparece on scroll) ─── */}
        <Animated.View style={[styles.glassNav, glassNavStyle]} pointerEvents="box-none">
          <View style={styles.glassNavInner}>
            <Text style={styles.glassNavTitle}>Início</Text>
            <View style={styles.navIcons}>
              <NavIconButton
                icon="notifications"
                badge={notifUnread}
                onPress={() => router.push('/notifications-feed' as any)}
              />
              <NavIconButton
                icon="person"
                onPress={() => router.push('/(tabs)/profile')}
              />
            </View>
          </View>
        </Animated.View>

        {/* ─── Live Activity Banner (Dynamic Island) ─── */}
        <LiveActivityBanner
          visible={!!hotDeal && !bannerDismissed}
          icon="flame"
          title={`Bônus imperdível · +${hotDeal?.currentBonus.toFixed(0) ?? 0}%`}
          subtitle={
            hotDeal
              ? `${hotDeal.fromProgram.name} → ${hotDeal.toProgram.name}`
              : undefined
          }
          accent="aurora"
          onPress={() => router.push('/arbitrage' as any)}
          onDismiss={() => setBannerDismissed(true)}
        />

        <Animated.ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refetchAll}
              tintColor={aurora.cyan}
            />
          }
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          <FirstRunTip
            tipKey="home-intro-v1"
            title="Seu dashboard de arbitragem"
            body="Cadastre saldos pra ver quanto VOCÊ ganha em R$ em cada oportunidade. Perfil → Saldo de Milhas."
            icon="bulb"
          />

          {/* ═══ HEADER actions (corner icons sempre visíveis) ═══ */}
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.cornerIcons}
          >
            <NavIconButton
              icon="notifications"
              badge={notifUnread}
              onPress={() => router.push('/notifications-feed' as any)}
            />
            <NavIconButton
              icon="person"
              onPress={() => router.push('/(tabs)/profile')}
            />
          </Animated.View>

          {/* ═══ LARGE TITLE (Apple HIG editorial) ═══ */}
          <Animated.View
            entering={FadeInDown.duration(700).springify().damping(20)}
            style={[styles.largeTitle, largeTitleStyle]}
          >
            <Text style={styles.greetingLine}>{getGreeting()},</Text>
            <View style={styles.nameRow}>
              <SerifItalic style={styles.nameItalic}>{firstName}</SerifItalic>
              <Text style={styles.greetingLine}>.</Text>
            </View>
            <Text style={styles.subtitle}>
              Suas milhas, sempre <SerifItalic style={styles.subtitleItalic}>prontas</SerifItalic>.
            </Text>
          </Animated.View>

          {/* ═══ HERO WALLET CARD ═══ */}
          <Animated.View
            entering={FadeInDown.delay(120).duration(700).springify().damping(20)}
          >
            <PressableScale
              onPress={() => {
                haptics.tap();
                router.push('/(tabs)/wallet' as any);
              }}
              haptic="none"
              pressedScale={0.99}
            >
              <GlassCard
                radiusSize="xl"
                padding={24}
                glassIntensity="strong"
                elevated
              >
                <View style={styles.heroTop}>
                  <Text style={styles.heroLabel}>Saldo total</Text>
                  {weekDelta !== 0 && (
                    <DeltaChip value={weekDeltaPct} format="percent" size="md" />
                  )}
                </View>

                {wallet.isLoading ? (
                  <View style={{ marginTop: 8 }}>
                    <ShimmerSkeleton height={42} width="65%" radius="sm" />
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

                {/* Sparkline 7d */}
                {sparkData.some((v) => v > 0) && (
                  <View style={styles.sparkRow}>
                    <Sparkline
                      data={sparkData}
                      width={SCREEN_W - 80}
                      height={48}
                      positive={weekDelta >= 0}
                      variant="area"
                      delay={400}
                    />
                  </View>
                )}

                <View style={styles.heroFooter}>
                  <View style={styles.heroFooterLeft}>
                    <Ionicons
                      name="layers-outline"
                      size={14}
                      color={textTokens.tertiary}
                    />
                    <Text style={styles.heroFooterText}>
                      {programsCount === 0
                        ? 'Cadastre saldos'
                        : `${programsCount} programa${programsCount !== 1 ? 's' : ''} ativo${programsCount !== 1 ? 's' : ''}`}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={textTokens.tertiary}
                  />
                </View>
              </GlassCard>
            </PressableScale>
          </Animated.View>

          {/* ═══ BENTO 2x2 — Streak / Tier / Missions / Today ═══ */}
          <Animated.View
            entering={FadeInDown.delay(220).duration(700).springify().damping(20)}
            style={styles.bento}
          >
            <View style={styles.bentoRow}>
              <BentoCard
                icon="flame"
                iconBg={[premium.gold, premium.goldDark]}
                value={String(currentStreak)}
                label={currentStreak === 1 ? 'dia' : 'dias'}
                eyebrow="Streak"
                onPress={() => router.push('/missions' as any)}
              />
              <BentoCard
                icon="trophy"
                iconBg={
                  tierMeta
                    ? [tierMeta.color, tierMeta.bg]
                    : [aurora.cyan, aurora.iris]
                }
                value={tierMeta?.label ?? '—'}
                label={userRank ? `#${userRank}` : 'Sem rank'}
                eyebrow="Tier"
                onPress={() => router.push('/leaderboard' as any)}
              />
            </View>
            <View style={styles.bentoRow}>
              <BentoCard
                icon="ribbon"
                iconBg={[aurora.iris, aurora.magenta]}
                value={`${completedMissions}/${totalMissions}`}
                label="completas"
                eyebrow="Missões"
                onPress={() => router.push('/missions' as any)}
              />
              <BentoCard
                icon="trending-up"
                iconBg={[aurora.cyan, '#0060DF']}
                value={String(topOpportunities.length)}
                label={topOpportunities.length === 1 ? 'oferta' : 'ofertas'}
                eyebrow="Hoje"
                onPress={() => router.push('/arbitrage' as any)}
              />
            </View>
          </Animated.View>

          {/* ═══ MISSION READY (gold glow) ═══ */}
          {readyToClaim && (
            <Animated.View
              entering={FadeIn.delay(360).duration(500)}
              style={{ marginTop: space.md }}
            >
              <PressableScale
                onPress={() => {
                  confettiRef.current?.burst();
                  router.push('/missions' as any);
                }}
                haptic="success"
                pressedScale={0.98}
              >
                <LinearGradient
                  colors={[premium.gold, premium.goldLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.missionReady}
                >
                  <View style={styles.missionReadyIcon}>
                    <Ionicons
                      name="gift"
                      size={22}
                      color={textTokens.onGold}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.missionReadyTitle}>
                      Missão completa
                    </Text>
                    <Text style={styles.missionReadySub} numberOfLines={1}>
                      {readyToClaim.title} · +{readyToClaim.rewardDays}d Premium
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={textTokens.onGold}
                  />
                </LinearGradient>
              </PressableScale>
            </Animated.View>
          )}

          {/* ═══ OPORTUNIDADES — horizontal scroll cards ═══ */}
          <Animated.View entering={FadeInDown.delay(440).duration(700).springify().damping(20)}>
            <SectionHeader
              title="Oportunidades"
              subtitle={
                topOpportunities.length === 0
                  ? 'Sem bônus ativos agora'
                  : 'Bônus ativos pra transferência'
              }
              actionLabel="Ver todas"
              onAction={() => router.push('/arbitrage' as any)}
              marginTop={space.md}
            />

            {topOpportunities.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.oppsScroll}
                snapToInterval={SCREEN_W * 0.7 + 12}
                decelerationRate="fast"
              >
                {topOpportunities.map((o, i) => (
                  <OpportunityCard key={o.id ?? i} opportunity={o} />
                ))}
              </ScrollView>
            ) : (
              <GlassCard radiusSize="lg" padding={20} glassIntensity="medium">
                <View style={styles.emptyOpp}>
                  <Ionicons
                    name="sparkles-outline"
                    size={32}
                    color={textTokens.tertiary}
                  />
                  <Text style={styles.emptyOppText}>
                    Sem oportunidades agora.{'\n'}
                    Volte em breve — bônus mudam toda hora.
                  </Text>
                </View>
              </GlassCard>
            )}
          </Animated.View>

          {/* ═══ SUA SEMANA — Activity Ring (Apple Health style) ═══ */}
          <Animated.View entering={FadeInDown.delay(560).duration(700).springify().damping(20)}>
            <SectionHeader
              title="Sua semana"
              subtitle={
                weekActivity === 7
                  ? 'Você completou todos os dias.'
                  : `${weekActivity}/7 dias ativos`
              }
              marginTop={space.md}
            />

            <GlassCard radiusSize="xl" padding={24} glassIntensity="strong" elevated>
              <View style={styles.weekRow}>
                <ActivityRings
                  size={120}
                  strokeWidth={12}
                  rings={[
                    {
                      value: weekProgress,
                      color: aurora.cyan,
                      label: 'Semana',
                    },
                  ]}
                />
                <View style={styles.weekText}>
                  <Text style={styles.weekValue}>{weekActivity}</Text>
                  <Text style={styles.weekValueLabel}>de 7 dias</Text>
                  <Text style={styles.weekTagline}>
                    {weekActivity === 7
                      ? 'Streak completo. Você é fera.'
                      : weekActivity >= 5
                        ? 'Você está no caminho.'
                        : weekActivity >= 3
                          ? 'Continue assim.'
                          : 'Volte amanhã pra crescer o streak.'}
                  </Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>
        </Animated.ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═════════════════════════════════════════════════════════════════════

function NavIconButton({
  icon,
  badge,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  badge?: number;
  onPress?: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="tap"
      pressedScale={0.92}
      hitSlop={6}
    >
      <View style={styles.navIconBtn}>
        <Ionicons
          name={icon}
          size={20}
          color={badge ? aurora.cyan : textTokens.secondary}
        />
        {badge && badge > 0 ? (
          <View style={styles.navBadge}>
            <Text style={styles.navBadgeText}>
              {badge > 9 ? '9+' : badge}
            </Text>
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

function BentoCard({
  icon,
  iconBg,
  value,
  label,
  eyebrow,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconBg: [string, string];
  value: string;
  label: string;
  eyebrow: string;
  onPress?: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="tap"
      pressedScale={0.97}
      style={{ flex: 1 }}
    >
      <GlassCard
        radiusSize="lg"
        padding={18}
        glassIntensity="medium"
        style={styles.bentoCard}
      >
        <View style={styles.bentoIconRow}>
          <LinearGradient
            colors={iconBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bentoIcon}
          >
            <Ionicons name={icon} size={16} color="#fff" />
          </LinearGradient>
          <Text style={styles.bentoEyebrow}>{eyebrow}</Text>
        </View>

        <View style={styles.bentoValueGroup}>
          <Text style={styles.bentoValue} numberOfLines={1}>
            {value}
          </Text>
          <Text style={styles.bentoLabel} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </GlassCard>
    </PressableScale>
  );
}

function OpportunityCard({ opportunity }: { opportunity: any }) {
  const isImperdivel = opportunity.classification === 'IMPERDIVEL';
  const bonus = opportunity.currentBonus ?? 0;

  return (
    <PressableScale
      onPress={() => {
        haptics.tap();
        router.push('/arbitrage' as any);
      }}
      haptic="none"
      pressedScale={0.97}
      style={styles.oppCardWrap}
    >
      <GlassCard
        radiusSize="lg"
        padding={16}
        glassIntensity="strong"
        glow={isImperdivel ? 'gold' : 'cyan'}
      >
        <View style={styles.oppBonusRow}>
          <LinearGradient
            colors={
              isImperdivel
                ? [premium.gold, premium.goldLight]
                : [aurora.cyan, aurora.iris]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.oppBonusBadge}
          >
            <Ionicons
              name={isImperdivel ? 'flash' : 'trending-up'}
              size={12}
              color="#fff"
            />
            <Text style={styles.oppBonusText}>+{bonus.toFixed(0)}%</Text>
          </LinearGradient>
          {isImperdivel && (
            <Text style={styles.imperdivelLabel}>IMPERDÍVEL</Text>
          )}
        </View>

        <Text style={styles.oppFrom} numberOfLines={1}>
          {opportunity.fromProgram.name}
        </Text>
        <View style={styles.oppArrowRow}>
          <Ionicons
            name="arrow-down"
            size={14}
            color={textTokens.tertiary}
          />
        </View>
        <Text style={styles.oppTo} numberOfLines={1}>
          {opportunity.toProgram.name}
        </Text>
      </GlassCard>
    </PressableScale>
  );
}

// ═════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // Glass nav (sticky top, compact-on-scroll)
  glassNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(28, 28, 30, 0.72)',
    borderBottomWidth: 0.5,
    borderBottomColor: surface.glassBorder,
  },
  glassNavInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingTop: 50, // approximação safe-area-top em iOS
    paddingBottom: 12,
  },
  glassNavTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    letterSpacing: -0.3,
  },
  navIcons: {
    flexDirection: 'row',
    gap: 8,
  },

  // Scroll content
  scroll: {
    paddingHorizontal: space.md,
    paddingTop: space.xs,
    paddingBottom: 120,
  },

  // Header corner icons (sempre visível)
  cornerIcons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: space.sm,
  },
  navIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  navBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: aurora.magenta,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  navBadgeText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },

  // Large title (Apple HIG) — escala 32-36pt mobile, weight 700, tracking -0.04em
  largeTitle: {
    marginBottom: space.xl,
    paddingTop: space.xs,
  },
  greetingLine: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 34,
    letterSpacing: -1.4,
    lineHeight: 40,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  nameItalic: {
    color: textTokens.primary,
    fontSize: 34,
    fontWeight: '400',
    letterSpacing: -1.4,
    lineHeight: 40,
  },
  subtitle: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    letterSpacing: -0.1,
    lineHeight: 22,
    marginTop: 10,
  },
  subtitleItalic: {
    color: textTokens.primary,
    fontSize: 17,
  },

  // Hero wallet — value 44pt 700 + tabular-nums (Apple não usa 900)
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroLabel: {
    color: textTokens.tertiary,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroValueRow: {
    marginTop: 2,
    marginBottom: 14,
  },
  heroValue: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 44,
    letterSpacing: -1.8,
    lineHeight: 48,
    fontVariant: ['tabular-nums'],
  },
  sparkRow: {
    marginTop: 4,
    marginBottom: 18,
    alignItems: 'flex-start',
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: surface.glassBorder,
  },
  heroFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroFooterText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    letterSpacing: -0.05,
  },

  // Bento 2x2 — aspectRatio menor pra ter mais altura, gap entre value e label
  bento: {
    marginTop: space.md,
    gap: 12,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoCard: {
    aspectRatio: 1.15,
    justifyContent: 'space-between',
  },
  bentoIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bentoIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  bentoEyebrow: {
    color: textTokens.tertiary,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  bentoValue: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    letterSpacing: -0.6,
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
  },
  bentoLabel: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    letterSpacing: -0.05,
    marginTop: 4,
  },
  bentoValueGroup: {
    // wrapper pra agrupar value + label como uma unidade na base do card
  },

  // Mission ready (gold gradient)
  missionReady: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    shadowColor: premium.goldLight,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8,
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
    letterSpacing: -0.1,
  },
  missionReadySub: {
    color: textTokens.onGold,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    opacity: 0.85,
    marginTop: 1,
  },

  // Oportunidades horizontal scroll
  oppsScroll: {
    paddingRight: space.md,
    paddingVertical: 4,
    gap: 12,
  },
  oppCardWrap: {
    width: SCREEN_W * 0.7,
  },
  oppBonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  oppBonusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
  },
  oppBonusText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: -0.1,
    fontVariant: ['tabular-nums'],
  },
  imperdivelLabel: {
    color: premium.goldLight,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.4,
  },
  oppFrom: {
    color: textTokens.secondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  oppArrowRow: {
    paddingVertical: 8,
  },
  oppTo: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  emptyOpp: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  emptyOppText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Sua semana (Activity Ring) — value 36pt 700, gap 28 entre ring e text
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  weekText: {
    flex: 1,
  },
  weekValue: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 40,
    letterSpacing: -1.6,
    lineHeight: 44,
    fontVariant: ['tabular-nums'],
  },
  weekValueLabel: {
    color: textTokens.secondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    marginTop: 0,
    letterSpacing: -0.05,
  },
  weekTagline: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginTop: 14,
    letterSpacing: -0.05,
    lineHeight: 20,
  },
});

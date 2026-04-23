import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import {
  useLeaderboard,
  useMyLeaderboardStats,
  TIER_META,
  ReporterTier,
  LeaderboardWindow,
} from '../src/hooks/useLeaderboard';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
  AnimatedNumber,
  StaggerItem,
  SkeletonListItem,
  EmptyStateIllustrated,
  aurora,
  premium,
  semantic,
  system,
  surface,
  text as textTokens,
  space,
  gradients,
  motion,
  haptics,
} from '../src/components/primitives';

/**
 * Leaderboard v2 — holographic tier cards.
 *
 * Key moments:
 *  - Meu rank: card com gradient holográfico tier-specific + pulse idle
 *  - Top 3: medalhas com float animation
 *  - Row "você" tem breathing ring highlight (you-are-here)
 */
export default function LeaderboardScreen() {
  const [window, setWindow] = useState<LeaderboardWindow>('all');
  const top = useLeaderboard(50, window);
  const me = useMyLeaderboardStats();

  const monthLabel = new Date().toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const refreshing = top.isFetching || me.isFetching;
  const onRefresh = () => {
    haptics.medium();
    top.refetch();
    me.refetch();
  };

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Ranking</Text>
            <Text style={styles.subtitle}>Quem mais ajuda a comunidade</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={aurora.cyan}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Meu card holográfico ────────────────── */}
          {me.data && (
            <Animated.View
              entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
            >
              <HolographicTierCard
                tier={me.data.tier}
                approvedCount={me.data.approvedCount}
                rank={me.data.rank}
                nextTier={me.data.nextTier}
              />
            </Animated.View>
          )}

          {/* ─── Como funciona ─────────────────────── */}
          <Animated.View
            entering={FadeIn.delay(100).duration(motion.timing.medium)}
            style={{ marginTop: space.md }}
          >
            <GlassCard radiusSize="md" padding={14}>
              <Text style={styles.howTitle}>
                <Ionicons name="information-circle" size={13} color={aurora.cyan} />
                {'  '}Como funciona
              </Text>
              <Text style={styles.howText}>
                Reporta um bônus visto numa newsletter. Quando o admin valida, todo mundo no app
                ganha — e você sobe no ranking.
              </Text>
              <View style={styles.tiersRow}>
                {(Object.keys(TIER_META) as ReporterTier[]).map((t) => (
                  <View
                    key={t}
                    style={[
                      styles.tierPill,
                      { borderColor: `${TIER_META[t].color}55`, backgroundColor: `${TIER_META[t].color}14` },
                    ]}
                  >
                    <Text style={{ fontSize: 11 }}>{TIER_META[t].emoji}</Text>
                    <Text style={[styles.tierPillText, { color: TIER_META[t].color }]}>
                      {TIER_META[t].label}
                    </Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          </Animated.View>

          {/* ─── Window toggle ─────────────────────── */}
          <Animated.View
            entering={FadeIn.delay(160).duration(motion.timing.medium)}
            style={styles.windowToggle}
          >
            <WindowToggleBtn
              label="All-time"
              active={window === 'all'}
              onPress={() => {
                haptics.select();
                setWindow('all');
              }}
            />
            <WindowToggleBtn
              label={monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
              active={window === 'month'}
              onPress={() => {
                haptics.select();
                setWindow('month');
              }}
            />
          </Animated.View>

          {/* ─── Ranking section ───────────────────── */}
          <Text style={styles.sectionTitle}>
            {window === 'month' ? `Top 50 em ${monthLabel}` : 'Top 50 all-time'}
          </Text>

          {top.isLoading ? (
            <View style={{ gap: 4 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonListItem key={i} />
              ))}
            </View>
          ) : top.data?.reporters.length ? (
            <View style={{ gap: 8 }}>
              {top.data.reporters.map((r, i) => (
                <StaggerItem key={r.userId} index={i} baseDelay={220}>
                  <RankRow
                    rank={r.rank}
                    name={r.name}
                    tier={r.tier}
                    approvedCount={r.approvedCount}
                    isMe={me.data?.rank === r.rank}
                  />
                </StaggerItem>
              ))}
            </View>
          ) : (
            <GlassCard radiusSize="lg" padding={0}>
              <EmptyStateIllustrated
                variant="trophy"
                title="Ainda ninguém no ranking!"
                description="Seja o primeiro a reportar um bônus e ganhe o ouro."
                ctaLabel="Reportar um bônus"
                onCtaPress={() => router.push('/report-bonus' as any)}
              />
            </GlassCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── Holographic tier card ──────────────────────────────────────────────

function HolographicTierCard({
  tier,
  approvedCount,
  rank,
  nextTier,
}: {
  tier: ReporterTier;
  approvedCount: number;
  rank: number | null;
  nextTier: { needed: number; threshold: number; name: ReporterTier } | null;
}) {
  const tierMeta = TIER_META[tier];
  // Color sets por tier
  const tierColors: Record<ReporterTier, [string, string, string]> = {
    BRONZE: ['#8C5524', '#CD7F32', '#E89751'],
    SILVER: ['#5A5E66', '#C0C4CC', '#E3E6EB'],
    GOLD: [premium.goldDark, premium.gold, premium.goldLight],
    PLATINUM: [aurora.iris, aurora.cyan, aurora.magenta],
  };
  const colors = tierColors[tier];

  // Holographic shimmer — gradient slide infinito
  const shift = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    shift.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [shift, pulse]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const progress =
    nextTier !== null
      ? Math.min(100, (approvedCount / nextTier.threshold) * 100)
      : 100;

  return (
    <Animated.View style={cardStyle}>
      <View style={holoStyles.card}>
        {/* Gradient layer */}
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Darken pra contraste */}
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Sheen */}
        <LinearGradient
          colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { height: '50%' }]}
        />

        <View style={holoStyles.content}>
          <View style={holoStyles.topRow}>
            <Text style={holoStyles.emoji}>{tierMeta.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={holoStyles.label}>SEU TIER</Text>
              <Text style={holoStyles.tierName}>{tierMeta.label}</Text>
            </View>
            {rank && (
              <View style={holoStyles.rankBadge}>
                <Text style={holoStyles.rankText}>#{rank}</Text>
              </View>
            )}
          </View>

          <View style={holoStyles.statsRow}>
            <View style={holoStyles.stat}>
              <AnimatedNumber
                value={approvedCount}
                format="integer"
                style={holoStyles.statValue}
              />
              <Text style={holoStyles.statLabel}>
                report{approvedCount !== 1 ? 's' : ''} aprovado
                {approvedCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {nextTier && (
            <View style={holoStyles.progressBox}>
              <Text style={holoStyles.progressLabel}>
                Faltam <Text style={holoStyles.progressBold}>{nextTier.needed}</Text> pra{' '}
                {TIER_META[nextTier.name].label}
              </Text>
              <View style={holoStyles.progressTrack}>
                <View
                  style={[
                    holoStyles.progressFill,
                    {
                      width: `${progress}%`,
                      backgroundColor: TIER_META[nextTier.name].color,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          <AuroraButton
            label="Reportar novo bônus"
            icon="megaphone"
            iconPosition="left"
            size="sm"
            variant="ghost"
            onPress={() => router.push('/report-bonus' as any)}
            haptic="tap"
            fullWidth
            style={{ marginTop: space.sm, backgroundColor: 'rgba(255,255,255,0.18)' }}
          />
        </View>
      </View>
    </Animated.View>
  );
}

// ─── WindowToggle button (segmented) ───────────────────────────────────

function WindowToggleBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress} haptic="none" style={{ flex: 1 }}>
      <View style={[toggleStyles.btn, active && toggleStyles.active]}>
        {active && (
          <LinearGradient
            colors={gradients.auroraCyanMagenta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 10 }]}
          />
        )}
        <Text style={[toggleStyles.text, active && toggleStyles.textActive]}>
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

// ─── RankRow ────────────────────────────────────────────────────────────

function RankRow({
  rank,
  name,
  tier,
  approvedCount,
  isMe,
}: {
  rank: number;
  name: string;
  tier: ReporterTier;
  approvedCount: number;
  isMe: boolean;
}) {
  const tierMeta = TIER_META[tier];
  const ring = useSharedValue(1);

  // "You are here" breathing ring
  useEffect(() => {
    if (!isMe) return;
    ring.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [isMe, ring]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isMe ? ring.value : 1 }],
  }));

  // Medalha float idle (só top 3)
  const floatVal = useSharedValue(0);
  useEffect(() => {
    if (rank > 3) return;
    floatVal.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [rank, floatVal]);

  const medalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 * Math.sin(floatVal.value * Math.PI) }],
  }));

  return (
    <Animated.View style={rowStyle}>
      <GlassCard
        radiusSize="md"
        padding={12}
        glow={isMe ? 'cyan' : 'none'}
        style={[rowStyles.row, isMe && rowStyles.meRow]}
      >
        <View style={rowStyles.rankBox}>
          {rank <= 3 ? (
            <Animated.Text style={[rowStyles.medal, medalStyle]}>
              {['🥇', '🥈', '🥉'][rank - 1]}
            </Animated.Text>
          ) : (
            <Text style={rowStyles.rankNum}>#{rank}</Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={rowStyles.name}>{name}</Text>
            {isMe && (
              <View style={rowStyles.youPill}>
                <Text style={rowStyles.youText}>VOCÊ</Text>
              </View>
            )}
          </View>
          <Text style={rowStyles.count}>
            {approvedCount} report{approvedCount !== 1 ? 's' : ''}
          </Text>
        </View>

        <View
          style={[
            rowStyles.tierBadge,
            { backgroundColor: `${tierMeta.color}22`, borderColor: `${tierMeta.color}44` },
          ]}
        >
          <Text style={{ fontSize: 11 }}>{tierMeta.emoji}</Text>
          <Text style={[rowStyles.tierText, { color: tierMeta.color }]}>
            {tierMeta.label}
          </Text>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const holoStyles = StyleSheet.create({
  card: {
    minHeight: 180,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: aurora.magenta,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  content: {
    padding: space.xl,
    zIndex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  emoji: {
    fontSize: 44,
  },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
  },
  tierName: {
    fontFamily: 'Inter_900Black',
    fontSize: 28,
    letterSpacing: -0.6,
    color: '#FFF',
    marginTop: 2,
  },
  rankBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  rankText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#FFF',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: space.md,
    gap: space.lg,
  },
  stat: {
    flexDirection: 'column',
  },
  statValue: {
    fontFamily: 'Inter_900Black',
    fontSize: 32,
    letterSpacing: -0.8,
    color: '#FFF',
  },
  statLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  progressBox: {
    marginTop: space.md,
  },
  progressLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
  },
  progressBold: {
    fontFamily: 'Inter_700Bold',
    color: '#FFF',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});

const toggleStyles = StyleSheet.create({
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    overflow: 'hidden',
  },
  active: {},
  text: {
    color: textTokens.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  textActive: {
    color: '#041220',
    fontFamily: 'Inter_700Bold',
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  meRow: {
    borderColor: `${aurora.cyan}66`,
  },
  rankBox: {
    width: 40,
    alignItems: 'center',
  },
  medal: {
    fontSize: 24,
  },
  rankNum: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  name: {
    color: textTokens.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  count: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
  youPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: aurora.cyan,
  },
  youText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: '#041220',
    letterSpacing: 0.4,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.3,
  },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: 8,
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
  },
  titleBox: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 1,
  },
  content: {
    padding: space.md,
    paddingBottom: 120,
  },

  howTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  howText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  tiersRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierPillText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
  windowToggle: {
    flexDirection: 'row',
    gap: 6,
    marginTop: space.md,
    padding: 3,
    backgroundColor: surface.glass,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: surface.glassBorder,
  },
  sectionTitle: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: space.md,
    marginBottom: space.sm,
    paddingHorizontal: 4,
  },
});

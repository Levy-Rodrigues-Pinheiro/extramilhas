import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useMissions, useClaimMission, Mission } from '../src/hooks/useMissions';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
  AnimatedNumber,
  StaggerItem,
  SkeletonCard,
  EmptyStateIllustrated,
  ConfettiBurst,
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
} from '../src/components/primitives';

/**
 * Missões v2 — Apple Fitness-style completion celebration.
 *
 * Signature moment: ao resgatar missão completa → confetti burst +
 * haptic success + alert. Cada card tem icon colored + progress bar
 * gradient + reward chip gold.
 */
export default function MissionsScreen() {
  const { data, isLoading, isRefetching, refetch } = useMissions();
  const claim = useClaimMission();
  const confettiRef = useRef<ConfettiBurstHandle>(null);

  const handleClaim = async (m: Mission) => {
    try {
      haptics.medium();
      const res = await claim.mutateAsync(m.id);
      confettiRef.current?.burst();
      haptics.success();
      Alert.alert(
        '🎉 Recompensa resgatada!',
        `Você ganhou ${res.rewardDays} dias Premium. Aproveite as oportunidades desbloqueadas!`,
      );
    } catch (err: any) {
      haptics.error();
      Alert.alert('Erro', err?.response?.data?.message || 'Falha ao resgatar');
    }
  };

  const iconFor = (targetType: string): React.ComponentProps<typeof Ionicons>['name'] => {
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

  // Stats resumidos
  const completed = data?.missions?.filter((m) => m.claimed).length ?? 0;
  const ready = data?.missions?.filter((m) => !m.claimed && m.progress >= m.targetCount).length ?? 0;
  const active = data?.missions?.filter((m) => !m.claimed).length ?? 0;

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ConfettiBurst ref={confettiRef} />

        {/* Header */}
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Missões</Text>
            <Text style={styles.subtitle}>Ganhe dias Premium grátis</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                haptics.medium();
                refetch();
              }}
              tintColor={aurora.cyan}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={{ gap: 14 }}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : !data?.missions || data.missions.length === 0 ? (
            <GlassCard radiusSize="xl" padding={0}>
              <EmptyStateIllustrated
                variant="trophy"
                title="Nenhuma missão ativa"
                description="Missões aparecem aqui automaticamente. Continue usando o app pra desbloquear Premium grátis."
              />
            </GlassCard>
          ) : (
            <>
              {/* Stats hero */}
              <Animated.View
                entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
              >
                <View style={styles.statsRow}>
                  <StatMini
                    icon="star"
                    label="Ativas"
                    value={active}
                    color={aurora.cyan}
                  />
                  <StatMini
                    icon="flash"
                    label="Prontas"
                    value={ready}
                    color={premium.goldLight}
                    highlight={ready > 0}
                  />
                  <StatMini
                    icon="checkmark-circle"
                    label="Concluídas"
                    value={completed}
                    color={semantic.success}
                  />
                </View>
              </Animated.View>

              {/* Missions list */}
              <View style={{ marginTop: space.md }}>
                <Text style={styles.sectionLabel}>Suas missões</Text>
                <View style={{ gap: 12 }}>
                  {data.missions.map((m, i) => (
                    <StaggerItem key={m.id} index={i} baseDelay={120}>
                      <MissionCard
                        m={m}
                        iconName={iconFor(m.targetType)}
                        onClaim={() => handleClaim(m)}
                        isPending={claim.isPending}
                      />
                    </StaggerItem>
                  ))}
                </View>
              </View>

              {/* Tip box */}
              <Animated.View entering={FadeInDown.delay(400).duration(motion.timing.medium)}>
                <GlassCard radiusSize="md" padding={12} style={styles.tipBox}>
                  <View style={styles.tipIcon}>
                    <Ionicons name="bulb" size={14} color={aurora.cyan} />
                  </View>
                  <Text style={styles.tipText}>
                    Progresso é contado desde o início. Missões novas aparecem aqui
                    automaticamente.
                  </Text>
                </GlassCard>
              </Animated.View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── StatMini ───────────────────────────────────────────────────────────

function StatMini({
  icon,
  label,
  value,
  color,
  highlight,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number;
  color: string;
  highlight?: boolean;
}) {
  return (
    <GlassCard
      radiusSize="lg"
      padding={12}
      glow={highlight ? 'gold' : 'none'}
      style={statStyles.card}
    >
      <View style={[statStyles.iconWrap, { backgroundColor: `${color}1F`, borderColor: `${color}55` }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <AnimatedNumber value={value} format="integer" style={[statStyles.value, { color }]} />
      <Text style={statStyles.label}>{label}</Text>
    </GlassCard>
  );
}

// ─── MissionCard ────────────────────────────────────────────────────────

function MissionCard({
  m,
  iconName,
  onClaim,
  isPending,
}: {
  m: Mission;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  onClaim: () => void;
  isPending: boolean;
}) {
  const percent = Math.min(100, (m.progress / m.targetCount) * 100);
  const canClaim = !m.claimed && m.progress >= m.targetCount;
  const isCompleted = m.claimed;

  const iconColor = isCompleted
    ? semantic.success
    : canClaim
    ? premium.goldLight
    : aurora.cyan;
  const iconBg = isCompleted
    ? semantic.successBg
    : canClaim
    ? premium.goldSoft
    : aurora.cyanSoft;

  return (
    <GlassCard
      radiusSize="lg"
      padding={16}
      glow={canClaim ? 'gold' : 'none'}
      style={isCompleted && { opacity: 0.65 }}
    >
      <View style={cardStyles.header}>
        <View
          style={[
            cardStyles.iconBox,
            { backgroundColor: iconBg, borderColor: `${iconColor}55` },
          ]}
        >
          <Ionicons
            name={isCompleted ? 'checkmark-circle' : iconName}
            size={22}
            color={iconColor}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={cardStyles.title}>{m.title}</Text>
          <Text style={cardStyles.desc}>{m.description}</Text>
        </View>

        <View style={cardStyles.reward}>
          <Text style={cardStyles.rewardValue}>+{m.rewardDays}d</Text>
          <Text style={cardStyles.rewardLabel}>Premium</Text>
        </View>
      </View>

      {!isCompleted && (
        <>
          <View style={cardStyles.progressRow}>
            <Text style={cardStyles.progressText}>
              {m.progress} / {m.targetCount}
            </Text>
            <Text style={[cardStyles.progressPercent, { color: iconColor }]}>
              {percent.toFixed(0)}%
            </Text>
          </View>
          <View style={cardStyles.progressTrack}>
            <LinearGradient
              colors={
                canClaim
                  ? (gradients.premium as any)
                  : (gradients.auroraCyanMagenta as any)
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[cardStyles.progressFill, { width: `${percent}%` }]}
            />
          </View>
        </>
      )}

      {canClaim && (
        <View style={{ marginTop: 14 }}>
          <AuroraButton
            label={`Resgatar ${m.rewardDays}d Premium`}
            onPress={onClaim}
            loading={isPending}
            variant="gold"
            size="md"
            icon="gift"
            iconPosition="left"
            fullWidth
            haptic="success"
          />
        </View>
      )}

      {isCompleted && (
        <View style={cardStyles.completedBadge}>
          <Ionicons name="checkmark-circle" size={14} color={semantic.success} />
          <Text style={cardStyles.completedText}>
            Resgatado em{' '}
            {m.rewardClaimedAt
              ? new Date(m.rewardClaimedAt).toLocaleDateString('pt-BR')
              : ''}
          </Text>
        </View>
      )}
    </GlassCard>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 4,
  },
  value: {
    fontFamily: 'Inter_900Black',
    fontSize: 24,
    letterSpacing: -0.4,
  },
  label: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
});

const cardStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    letterSpacing: -0.1,
  },
  desc: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  reward: {
    alignItems: 'flex-end',
  },
  rewardValue: {
    color: premium.goldLight,
    fontFamily: 'Inter_900Black',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  rewardLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 14,
    marginBottom: 6,
  },
  progressText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  progressPercent: {
    fontFamily: 'Inter_900Black',
    fontSize: 14,
    letterSpacing: -0.2,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: surface.glass,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: surface.glassBorder,
  },
  completedText: {
    color: semantic.success,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
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
    marginLeft: 4,
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
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: space.md,
  },
  tipIcon: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: aurora.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
});

import React, { useState } from 'react';
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import api from '../src/lib/api';
import {
  AuroraBackground,
  GlassCard,
  PressableScale,
  AnimatedNumber,
  StaggerItem,
  SkeletonCard,
  EmptyStateIllustrated,
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

interface HistoryReport {
  id: string;
  fromProgramSlug: string;
  toProgramSlug: string;
  bonusPercent: number;
  expiresAt: string | null;
  createdAt: string;
}

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
    return { count: list.length, avg, max };
  }, [data]);

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Histórico de bônus</Text>
            <Text style={styles.subtitle}>Todos aprovados pela comunidade</Text>
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
          {/* Window toggle */}
          <Animated.View
            entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
            style={styles.windowRow}
          >
            {[7, 30, 90].map((w) => (
              <WindowBtn
                key={w}
                label={`${w} dias`}
                active={window === w}
                onPress={() => setWindow(w as Window)}
              />
            ))}
          </Animated.View>

          {/* Stats */}
          {stats && (
            <Animated.View
              entering={FadeInDown.delay(60).duration(motion.timing.medium).springify()}
              style={styles.statsRow}
            >
              <StatCard icon="checkmark-circle" label="Bônus" value={stats.count} color={aurora.cyan} />
              <StatCard
                icon="stats-chart"
                label="Média"
                value={stats.avg}
                color={aurora.magenta}
                suffix="%"
              />
              <StatCard
                icon="trophy"
                label="Maior"
                value={stats.max}
                color={premium.goldLight}
                suffix="%"
              />
            </Animated.View>
          )}

          {isLoading && (
            <View style={{ gap: 14, marginTop: space.md }}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          )}

          {!isLoading && groupedByDay.length === 0 && (
            <View style={{ marginTop: space.md }}>
              <GlassCard radiusSize="xl" padding={0}>
                <EmptyStateIllustrated
                  variant="radar"
                  title="Sem bônus nessa janela"
                  description="Mude o período acima ou volte em breve — bônus novos aparecem a cada semana."
                />
              </GlassCard>
            </View>
          )}

          {/* Timeline */}
          {groupedByDay.map(([day, reports], dayIdx) => (
            <Animated.View
              key={day}
              entering={FadeInDown.delay(dayIdx * 100 + 100).duration(motion.timing.medium)}
              style={styles.dayBlock}
            >
              <View style={styles.dayHeader}>
                <View style={styles.dayDotWrap}>
                  <View style={styles.dayDotHalo} />
                  <LinearGradient
                    colors={gradients.auroraCyanMagenta}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.dayDot}
                  />
                </View>
                <Text style={styles.dayLabel}>{day}</Text>
                <View style={{ flex: 1 }} />
                <View style={styles.dayCountChip}>
                  <Text style={styles.dayCountText}>
                    {reports.length} bônus{reports.length > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.dayItems}>
                {reports.map((r, i) => {
                  const pct = Math.round(r.bonusPercent);
                  const color = pct >= 80 ? premium.goldLight : pct >= 40 ? semantic.success : textTokens.muted;
                  const bgColor = pct >= 80 ? premium.goldSoft : pct >= 40 ? semantic.successBg : surface.glass;
                  const daysLeft = r.expiresAt
                    ? Math.ceil((new Date(r.expiresAt).getTime() - Date.now()) / 86400_000)
                    : null;
                  const expired = daysLeft !== null && daysLeft < 0;

                  return (
                    <StaggerItem key={r.id} index={i} baseDelay={dayIdx * 100}>
                      <GlassCard
                        radiusSize="md"
                        padding={12}
                        glow={pct >= 80 && !expired ? 'gold' : 'none'}
                        style={[reportStyles.card, expired && { opacity: 0.45 }]}
                      >
                        <View
                          style={[
                            reportStyles.pctBox,
                            { backgroundColor: bgColor, borderColor: `${color}55` },
                          ]}
                        >
                          <Text style={[reportStyles.pctPlus, { color }]}>+</Text>
                          <Text style={[reportStyles.pct, { color }]}>{pct}</Text>
                          <Text style={[reportStyles.pctPct, { color }]}>%</Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={reportStyles.title}>
                            {r.fromProgramSlug} → {r.toProgramSlug}
                          </Text>
                          {r.expiresAt && (
                            <View style={reportStyles.expiresRow}>
                              <Ionicons
                                name={expired ? 'close-circle' : 'time-outline'}
                                size={11}
                                color={expired ? semantic.danger : textTokens.muted}
                              />
                              <Text
                                style={[
                                  reportStyles.expires,
                                  expired && { color: semantic.danger },
                                ]}
                              >
                                {expired
                                  ? 'Expirou'
                                  : daysLeft === 0
                                  ? 'Expira hoje'
                                  : daysLeft === 1
                                  ? 'Expira amanhã'
                                  : `${daysLeft}d restantes`}
                              </Text>
                            </View>
                          )}
                        </View>
                      </GlassCard>
                    </StaggerItem>
                  );
                })}
              </View>
            </Animated.View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function WindowBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={() => {
        haptics.select();
        onPress();
      }}
      haptic="none"
      style={{ flex: 1 }}
    >
      <View style={[styles.windowBtn, active && styles.windowBtnActive]}>
        {active && (
          <LinearGradient
            colors={gradients.auroraCyanMagenta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 10 }]}
          />
        )}
        <Text style={[styles.windowText, active && styles.windowTextActive]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  suffix,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
  suffix?: string;
}) {
  return (
    <GlassCard radiusSize="md" padding={12} style={statStyles.card}>
      <View style={[statStyles.iconWrap, { backgroundColor: `${color}1F` }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <AnimatedNumber
        value={value}
        format="integer"
        suffix={suffix}
        style={[statStyles.value, { color }]}
      />
      <Text style={statStyles.label}>{label}</Text>
    </GlassCard>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: 'Inter_900Black',
    fontSize: 22,
    letterSpacing: -0.4,
    marginTop: 4,
  },
  label: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
  },
});

const reportStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pctBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 72,
    justifyContent: 'center',
  },
  pctPlus: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  pct: {
    fontFamily: 'Inter_900Black',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  pctPct: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    marginLeft: 1,
  },
  title: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: -0.2,
  },
  expiresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  expires: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
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

  windowRow: {
    flexDirection: 'row',
    gap: 6,
    padding: 3,
    backgroundColor: surface.glass,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    marginBottom: space.md,
  },
  windowBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden',
  },
  windowBtnActive: {},
  windowText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  windowTextActive: {
    color: '#041220',
    fontFamily: 'Inter_700Bold',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: space.md,
  },

  dayBlock: {
    marginTop: space.md,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  dayDotWrap: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayDotHalo: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: aurora.cyanSoft,
  },
  dayDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dayLabel: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  dayCountChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderColor: surface.glassBorder,
  },
  dayCountText: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  dayItems: {
    gap: 8,
    paddingLeft: 6,
    borderLeftWidth: 1,
    borderLeftColor: surface.separator,
    marginLeft: 7,
  },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { usePortfolioAnalysis, useSignals } from '../src/hooks/usePortfolio';
import {
  AuroraBackground,
  GlassCard,
  PressableScale,
  AnimatedNumber,
  StaggerItem,
  SkeletonCard,
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

const SIGNAL_META: Record<
  string,
  {
    label: string;
    color: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
  }
> = {
  BUY_STRONG: { label: 'BUY STRONG', color: semantic.success, icon: 'trending-up' },
  BUY: { label: 'BUY', color: semantic.success, icon: 'trending-up' },
  HOLD: { label: 'HOLD', color: textTokens.muted, icon: 'pause-circle' },
  SELL: { label: 'SELL', color: premium.goldLight, icon: 'trending-down' },
};

/**
 * Portfolio analysis v2 — Apple Investing / Health-style charts.
 *
 * Signature: hero concentration card + composition bars animadas
 * sequencialmente + signal cards com arrow indicators.
 */
export default function PortfolioAnalysisScreen() {
  const { t } = useTranslation();
  const { data: analysis, isLoading: ln } = usePortfolioAnalysis();
  const { data: signals, isLoading: ls } = useSignals();

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Análise da carteira</Text>
            <Text style={styles.subtitle}>Sinais e diversificação</Text>
          </View>
        </View>

        {ln ? (
          <View style={{ padding: space.md, gap: 14 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : !analysis ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle" size={32} color={semantic.danger} />
            <Text style={styles.errorText}>{t('errors.generic')}</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* ─── Hero: Concentration HHI ───────────── */}
            <Animated.View
              entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
            >
              <ConcentrationHero
                concentration={analysis.concentration ?? 0}
                label={analysis.concentrationLabel}
                dominantProgram={analysis.dominantProgram}
              />
            </Animated.View>

            {/* ─── Composition bars ──────────────────── */}
            {analysis.breakdown.length > 0 && (
              <View style={{ marginTop: space.md }}>
                <Text style={styles.sectionLabel}>COMPOSIÇÃO</Text>
                <GlassCard radiusSize="lg" padding={16}>
                  <View style={{ gap: 12 }}>
                    {analysis.breakdown.map((b, i) => (
                      <StaggerItem key={b.programId} index={i} baseDelay={100}>
                        <CompositionRow
                          name={b.programName}
                          percent={b.sharePercent}
                          index={i}
                        />
                      </StaggerItem>
                    ))}
                  </View>
                </GlassCard>
              </View>
            )}

            {/* ─── Suggestions ──────────────────────── */}
            {analysis.suggestions.length > 0 && (
              <View style={{ marginTop: space.md }}>
                <Text style={styles.sectionLabel}>RECOMENDAÇÕES</Text>
                <View style={{ gap: 10 }}>
                  {analysis.suggestions.map((s, i) => (
                    <StaggerItem key={i} index={i} baseDelay={120}>
                      <SuggestionCard
                        severity={s.severity}
                        title={s.title}
                        text={s.text}
                        action={s.action}
                      />
                    </StaggerItem>
                  ))}
                </View>
              </View>
            )}

            {/* ─── Signals ──────────────────────────── */}
            <View style={{ marginTop: space.md }}>
              <Text style={styles.sectionLabel}>SINAIS DE MERCADO</Text>
              {ls ? (
                <SkeletonCard />
              ) : !signals || signals.length === 0 ? (
                <GlassCard radiusSize="lg" padding={20} style={styles.emptyBox}>
                  <Ionicons name="analytics" size={28} color={textTokens.muted} />
                  <Text style={styles.emptyText}>
                    Histórico insuficiente pra sinais. Volte em alguns dias.
                  </Text>
                </GlassCard>
              ) : (
                <View style={{ gap: 10 }}>
                  {signals.map((s, i) => (
                    <StaggerItem key={s.programId} index={i} baseDelay={100}>
                      <SignalCard signal={s} />
                    </StaggerItem>
                  ))}
                </View>
              )}
            </View>

            {/* Disclaimer */}
            <Animated.View
              entering={FadeIn.delay(500).duration(motion.timing.medium)}
              style={{ marginTop: space.md }}
            >
              <GlassCard radiusSize="md" padding={12}>
                <View style={styles.disclaimerRow}>
                  <Ionicons
                    name="information-circle"
                    size={14}
                    color={textTokens.muted}
                  />
                  <Text style={styles.disclaimerText}>
                    Sinais baseados em regras simples (mediana 30d). Não é recomendação
                    financeira — use como apoio à decisão.
                  </Text>
                </View>
              </GlassCard>
            </Animated.View>
          </ScrollView>
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── ConcentrationHero ──────────────────────────────────────────────────

function ConcentrationHero({
  concentration,
  label,
  dominantProgram,
}: {
  concentration: number;
  label: string;
  dominantProgram?: { sharePercent: number; programName: string } | null;
}) {
  // Color based on concentration level
  const isDiversified = concentration < 3000;
  const isConcentrated = concentration > 6000;
  const bgGradient: [string, string, string] = isDiversified
    ? ['#0F8A3C', '#30D158', '#66E88A']
    : isConcentrated
    ? ['#A30014', '#FF453A', '#FF7A73']
    : (gradients.aurora as any);

  return (
    <View style={heroStyles.card}>
      <LinearGradient
        colors={bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.52)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { height: '45%' }]}
      />

      <View style={heroStyles.content}>
        <View style={heroStyles.iconCircle}>
          <Ionicons name="pie-chart" size={20} color="#FFF" />
        </View>
        <Text style={heroStyles.label}>CONCENTRAÇÃO (HHI)</Text>
        <AnimatedNumber
          value={concentration}
          format="integer"
          style={heroStyles.value}
        />
        <View style={heroStyles.tagChip}>
          <Text style={heroStyles.tagText}>{label}</Text>
        </View>
        {dominantProgram && (
          <Text style={heroStyles.sub}>
            <Text style={heroStyles.subBold}>{dominantProgram.sharePercent}%</Text> em{' '}
            {dominantProgram.programName}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── CompositionRow ────────────────────────────────────────────────────

function CompositionRow({
  name,
  percent,
  index,
}: {
  name: string;
  percent: number;
  index: number;
}) {
  const progress = useSharedValue(0);
  const colors = [aurora.cyan, aurora.magenta, premium.goldLight, semantic.success];
  const color = colors[index % colors.length];

  React.useEffect(() => {
    progress.value = withDelay(
      index * 60 + 200,
      withTiming(1, {
        duration: 900,
        easing: motion.curve.decelerated,
      }),
    );
  }, [index, progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.max(2, progress.value * percent)}%`,
  }));

  return (
    <View style={composStyles.row}>
      <View style={composStyles.topRow}>
        <View style={composStyles.nameRow}>
          <View style={[composStyles.dot, { backgroundColor: color }]} />
          <Text style={composStyles.name}>{name}</Text>
        </View>
        <AnimatedNumber
          value={percent}
          format="integer"
          suffix="%"
          style={[composStyles.percent, { color }]}
        />
      </View>
      <View style={composStyles.barTrack}>
        <Animated.View style={[composStyles.barFill, barStyle]}>
          <LinearGradient
            colors={[`${color}AA`, color]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </View>
  );
}

// ─── SuggestionCard ────────────────────────────────────────────────────

function SuggestionCard({
  severity,
  title,
  text,
  action,
}: {
  severity: 'info' | 'warn' | 'critical';
  title: string;
  text: string;
  action?: string | null;
}) {
  const color =
    severity === 'critical'
      ? semantic.danger
      : severity === 'warn'
      ? premium.goldLight
      : aurora.cyan;
  const bgColor =
    severity === 'critical'
      ? semantic.dangerBg
      : severity === 'warn'
      ? premium.goldSoft
      : aurora.cyanSoft;
  const icon =
    severity === 'critical'
      ? 'alert-circle'
      : severity === 'warn'
      ? 'warning'
      : 'information-circle';

  return (
    <GlassCard
      radiusSize="lg"
      padding={14}
      glow={severity === 'critical' ? 'danger' : severity === 'warn' ? 'gold' : 'none'}
    >
      <View style={sugStyles.row}>
        <View style={[sugStyles.iconBox, { backgroundColor: bgColor, borderColor: `${color}55` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={sugStyles.title}>{title}</Text>
          <Text style={sugStyles.text}>{text}</Text>
          {action && (
            <PressableScale
              onPress={() => {
                haptics.tap();
                router.push(action as any);
              }}
              haptic="none"
              style={sugStyles.actionBtn}
            >
              <Text style={[sugStyles.actionText, { color }]}>Ver ação</Text>
              <Ionicons name="arrow-forward" size={12} color={color} />
            </PressableScale>
          )}
        </View>
      </View>
    </GlassCard>
  );
}

// ─── SignalCard ────────────────────────────────────────────────────────

function SignalCard({
  signal,
}: {
  signal: {
    programId: string;
    programName: string;
    signal: string;
    currentCpm: number;
    median30d: number;
    text: string;
  };
}) {
  const meta = SIGNAL_META[signal.signal] ?? SIGNAL_META.HOLD;
  const delta = signal.currentCpm - signal.median30d;
  const deltaPct = (delta / signal.median30d) * 100;

  return (
    <GlassCard radiusSize="lg" padding={14}>
      <View style={sigStyles.topRow}>
        <Text style={sigStyles.program}>{signal.programName}</Text>
        <View style={[sigStyles.badge, { backgroundColor: `${meta.color}1F`, borderColor: `${meta.color}66` }]}>
          <Ionicons name={meta.icon} size={11} color={meta.color} />
          <Text style={[sigStyles.badgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      {/* CPM row */}
      <View style={sigStyles.cpmRow}>
        <View style={sigStyles.cpmCol}>
          <Text style={sigStyles.cpmLabel}>CPM atual</Text>
          <Text style={sigStyles.cpmValue}>R$ {signal.currentCpm.toFixed(2)}</Text>
        </View>
        <View style={sigStyles.cpmCol}>
          <Text style={sigStyles.cpmLabel}>Mediana 30d</Text>
          <Text style={sigStyles.cpmValueMuted}>R$ {signal.median30d.toFixed(2)}</Text>
        </View>
        <View style={sigStyles.cpmCol}>
          <Text style={sigStyles.cpmLabel}>Delta</Text>
          <View style={sigStyles.deltaRow}>
            <Ionicons
              name={delta > 0 ? 'arrow-up' : 'arrow-down'}
              size={11}
              color={delta > 0 ? semantic.success : semantic.danger}
            />
            <Text
              style={[
                sigStyles.deltaText,
                { color: delta > 0 ? semantic.success : semantic.danger },
              ]}
            >
              {Math.abs(deltaPct).toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      <Text style={sigStyles.text}>{signal.text}</Text>
    </GlassCard>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const heroStyles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 12,
  },
  content: {
    padding: space.xl,
    alignItems: 'center',
    zIndex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  label: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  value: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -2,
    marginTop: 4,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    marginTop: 8,
  },
  tagText: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  sub: {
    color: '#FFF',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 12,
  },
  subBold: {
    fontFamily: 'Inter_900Black',
  },
});

const composStyles = StyleSheet.create({
  row: {
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    color: textTokens.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  percent: {
    fontFamily: 'Inter_900Black',
    fontSize: 15,
    letterSpacing: -0.2,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: surface.glass,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
});

const sugStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  text: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
});

const sigStyles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  program: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.6,
  },
  cpmRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: surface.glassBorder,
  },
  cpmCol: {
    flex: 1,
  },
  cpmLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  cpmValue: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  cpmValueMuted: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  deltaText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  text: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: surface.glassBorder,
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

  sectionLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  errorText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },

  emptyBox: {
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    textAlign: 'center',
  },

  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    color: textTokens.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
  },
});

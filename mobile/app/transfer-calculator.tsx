import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useTransferCalculator, TransferCalcResult } from '../src/hooks/useArbitrage';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
  AnimatedNumber,
  StaggerItem,
  FloatingLabelInput,
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

const PROGRAMS = [
  { slug: 'livelo', name: 'Livelo', color: '#E91E63' },
  { slug: 'esfera', name: 'Esfera', color: '#9C27B0' },
  { slug: 'smiles', name: 'Smiles', color: '#FF9800' },
  { slug: 'tudoazul', name: 'TudoAzul', color: '#2196F3' },
  { slug: 'latampass', name: 'Latam Pass', color: '#F44336' },
];

export default function TransferCalculatorScreen() {
  const params = useLocalSearchParams<{ from?: string; points?: string }>();
  const [fromProgram, setFromProgram] = useState(
    PROGRAMS.find((p) => p.slug === params.from)?.slug ?? 'livelo',
  );
  const [points, setPoints] = useState(params.points ?? '10000');
  const calc = useTransferCalculator();

  useEffect(() => {
    if (params.from && params.points) {
      const numPoints = parseInt(String(params.points).replace(/\D/g, ''), 10);
      if (numPoints && numPoints >= 100) {
        calc.mutate({ fromProgramSlug: String(params.from), points: numPoints });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCalculate = () => {
    const numPoints = parseInt(points.replace(/\D/g, ''), 10);
    if (!numPoints || numPoints < 100) {
      haptics.warning();
      return;
    }
    haptics.medium();
    calc.mutate({ fromProgramSlug: fromProgram, points: numPoints });
  };

  const shareResult = async () => {
    if (!calc.data) return;
    haptics.tap();
    const best = calc.data.results.find((r) => r.recommendation === 'TRANSFERIR');
    const header = best
      ? `💰 ${calc.data.inputPoints.toLocaleString('pt-BR')} pts ${calc.data.fromProgram.name} → vale R$ ${calc.data.inputValueBrl.toFixed(2)}\n` +
        `🎯 Melhor destino: ${best.toProgram.name} (${best.recommendation})\n\n`
      : `💰 Calculei ${calc.data.inputPoints.toLocaleString('pt-BR')} pts ${calc.data.fromProgram.name} = R$ ${calc.data.inputValueBrl.toFixed(2)}\n\n`;
    const link = `https://milhasextras.com.br/app/calculator?from=${encodeURIComponent(
      calc.data.fromProgram.slug,
    )}&points=${encodeURIComponent(String(calc.data.inputPoints))}`;
    try {
      await Share.share({ message: header + `Calcule o seu no Milhas Extras:\n${link}` });
    } catch {
      /* cancelled */
    }
  };

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
            </PressableScale>
            <View style={styles.titleBox}>
              <Text style={styles.title}>Vale a pena transferir?</Text>
              <Text style={styles.subtitle}>Calcula valor real em cada destino</Text>
            </View>
            {calc.data && (
              <PressableScale
                onPress={shareResult}
                haptic="tap"
                style={[styles.iconBtn, { backgroundColor: semantic.successBg }]}
              >
                <Ionicons name="share-social-outline" size={20} color={semantic.success} />
              </PressableScale>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* ─── Form ─────────────────────── */}
            <Animated.View
              entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
            >
              <GlassCard radiusSize="xl" padding={20} glassIntensity="medium">
                <Text style={styles.formLabel}>
                  <Ionicons name="swap-horizontal" size={12} color={aurora.cyan} />
                  {'  '}De qual programa?
                </Text>
                <View style={styles.programGrid}>
                  {PROGRAMS.map((p) => {
                    const selected = fromProgram === p.slug;
                    return (
                      <PressableScale
                        key={p.slug}
                        onPress={() => {
                          haptics.select();
                          setFromProgram(p.slug);
                        }}
                        haptic="none"
                      >
                        <View style={[styles.programChip, selected && styles.programChipSelected]}>
                          {selected && (
                            <LinearGradient
                              colors={gradients.auroraCyanMagenta}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
                            />
                          )}
                          <Text
                            style={[
                              styles.programChipText,
                              selected && styles.programChipTextSelected,
                            ]}
                          >
                            {p.name}
                          </Text>
                        </View>
                      </PressableScale>
                    );
                  })}
                </View>

                <View style={{ height: space.md }} />

                <FloatingLabelInput
                  label="Quantos pontos você tem?"
                  iconLeft="calculator-outline"
                  value={points}
                  onChangeText={(v) => setPoints(v.replace(/\D/g, ''))}
                  keyboardType="numeric"
                  maxLength={8}
                />

                <AuroraButton
                  label="Calcular agora"
                  onPress={handleCalculate}
                  loading={calc.isPending}
                  disabled={!points}
                  variant="primary"
                  size="lg"
                  icon="flash"
                  fullWidth
                  haptic="medium"
                />
              </GlassCard>
            </Animated.View>

            {/* ─── Error ─────────────────────── */}
            {calc.error && (
              <Animated.View
                entering={FadeInDown.duration(motion.timing.short)}
                style={{ marginTop: space.md }}
              >
                <GlassCard glow="danger" radiusSize="md" padding={14} style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={20} color={semantic.danger} />
                  <Text style={styles.errorText}>{calc.error.message || 'Erro no cálculo'}</Text>
                </GlassCard>
              </Animated.View>
            )}

            {/* ─── Results ─────────────────── */}
            {calc.data && <ResultsList data={calc.data} />}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── Results list ───────────────────────────────────────────────────────

function ResultsList({ data }: { data: TransferCalcResult }) {
  return (
    <View style={{ marginTop: space.md }}>
      {/* Summary */}
      <Animated.View
        entering={FadeInDown.delay(60).duration(motion.timing.medium).springify()}
      >
        <GlassCard radiusSize="lg" padding={16} glow="cyan" style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Você tem</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <AnimatedNumber
              value={data.inputPoints}
              format="integer"
              style={styles.summaryValue}
            />
            <Text style={styles.summaryUnit}>pts {data.fromProgram.name}</Text>
          </View>
          <Text style={styles.summarySub}>
            ≈ R$ {data.inputValueBrl.toFixed(2)} · CPM R$ {data.fromProgram.avgCpm.toFixed(2)}
          </Text>
        </GlassCard>
      </Animated.View>

      {data.results.length === 0 ? (
        <View style={{ marginTop: space.lg }}>
          <GlassCard radiusSize="lg" padding={0}>
            <EmptyStateIllustrated
              variant="radar"
              title="Sem transferências ativas"
              description="Nenhuma transferência bonificada ativa pra esse programa agora. Te avisamos quando aparecer."
            />
          </GlassCard>
        </View>
      ) : (
        <View style={{ marginTop: space.md, gap: space.sm }}>
          <Text style={styles.resultsHeader}>
            <Ionicons name="sparkles" size={11} color={premium.goldLight} />
            {'  '}
            {data.results.length} destino{data.results.length !== 1 ? 's' : ''} analisado
            {data.results.length !== 1 ? 's' : ''}
          </Text>
          {data.results.map((r, i) => (
            <StaggerItem key={i} index={i} baseDelay={180}>
              <ResultCard item={r} />
            </StaggerItem>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── ResultCard (verdict banner ink-fill) ───────────────────────────────

function ResultCard({ item }: { item: TransferCalcResult['results'][0] }) {
  const recColor =
    item.recommendation === 'TRANSFERIR'
      ? semantic.success
      : item.recommendation === 'ESPERAR'
      ? premium.goldLight
      : semantic.danger;
  const recBg =
    item.recommendation === 'TRANSFERIR'
      ? semantic.successBg
      : item.recommendation === 'ESPERAR'
      ? premium.goldSoft
      : semantic.dangerBg;
  const recLabel =
    item.recommendation === 'TRANSFERIR'
      ? 'TRANSFERIR'
      : item.recommendation === 'ESPERAR'
      ? 'ESPERAR'
      : 'NÃO TRANSFERIR';
  const recIcon =
    item.recommendation === 'TRANSFERIR'
      ? 'checkmark-circle'
      : item.recommendation === 'ESPERAR'
      ? 'time'
      : 'close-circle';

  // Ink-fill wipe no verdict banner ao aparecer
  const ink = useSharedValue(0);

  useEffect(() => {
    ink.value = withDelay(
      120,
      withTiming(1, { duration: motion.timing.long, easing: Easing.bezier(0.2, 0, 0, 1) }),
    );
  }, [ink]);

  const inkStyle = useAnimatedStyle(() => ({
    width: `${ink.value * 100}%`,
  }));

  return (
    <GlassCard
      radiusSize="lg"
      padding={0}
      glow={item.recommendation === 'TRANSFERIR' ? 'success' : 'none'}
      style={{ overflow: 'hidden' }}
    >
      {/* Verdict banner com ink-fill */}
      <View style={[resultStyles.verdictBanner, { backgroundColor: recBg }]}>
        <Animated.View
          style={[
            resultStyles.inkFill,
            { backgroundColor: `${recColor}22` },
            inkStyle,
          ]}
        />
        <View style={resultStyles.verdictContent}>
          <View style={[resultStyles.verdictIcon, { backgroundColor: `${recColor}32` }]}>
            <Ionicons name={recIcon as any} size={15} color={recColor} />
          </View>
          <Text style={[resultStyles.verdictText, { color: recColor }]}>{recLabel}</Text>
          <View style={{ flex: 1 }} />
          <View style={resultStyles.bonusWrap}>
            <Text style={[resultStyles.bonusPlus, { color: recColor }]}>+</Text>
            <Text style={[resultStyles.bonusBig, { color: recColor }]}>
              {item.bonusActive.toFixed(0)}
            </Text>
            <Text style={[resultStyles.bonusPct, { color: recColor }]}>%</Text>
          </View>
        </View>
      </View>

      <View style={{ padding: 16 }}>
        <Text style={resultStyles.destProgram}>→ {item.toProgram.name}</Text>

        {/* Métricas */}
        <View style={resultStyles.metricsRow}>
          <View style={resultStyles.metric}>
            <Text style={resultStyles.metricLabel}>Vira</Text>
            <AnimatedNumber
              value={item.resultingMiles}
              format="integer"
              suffix=" mi"
              style={resultStyles.metricValue}
            />
            <Text style={resultStyles.metricSub}>R$ {item.resultingValueBrl.toFixed(2)}</Text>
          </View>
          <View style={resultStyles.metricDivider} />
          <View style={resultStyles.metric}>
            <Text style={resultStyles.metricLabel}>Ganho</Text>
            <Text style={[resultStyles.metricValue, { color: recColor }]}>
              {item.gainPercent > 0 ? '+' : ''}
              {item.gainPercent.toFixed(1)}%
            </Text>
            <Text style={[resultStyles.metricSub, { color: recColor }]}>
              {item.valueGainBrl > 0 ? '+' : ''}R$ {item.valueGainBrl.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Reasoning */}
        <View style={resultStyles.reasoningBox}>
          <Ionicons name="bulb-outline" size={14} color={aurora.cyan} />
          <Text style={resultStyles.reasoningText}>{item.reasoning}</Text>
        </View>

        {/* Examples */}
        {item.examples && item.examples.length > 0 && (
          <View style={resultStyles.examplesBox}>
            <Text style={resultStyles.examplesTitle}>
              <Ionicons name="airplane" size={10} color={textTokens.muted} />
              {'  '}Onde você poderia ir:
            </Text>
            {item.examples.slice(0, 2).map((ex, i) => (
              <View key={i} style={resultStyles.exampleRow}>
                <View style={resultStyles.exampleDot} />
                <Text style={resultStyles.exampleText}>
                  {ex.destination} · {ex.milesNeeded.toLocaleString('pt-BR')} mi
                  {ex.tripsPossible > 1 && (
                    <Text style={resultStyles.exampleBold}>
                      {'  '}({ex.tripsPossible}× passagens)
                    </Text>
                  )}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </GlassCard>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const resultStyles = StyleSheet.create({
  verdictBanner: {
    position: 'relative',
    overflow: 'hidden',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inkFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  verdictContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1,
  },
  verdictIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verdictText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  bonusWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bonusPlus: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  bonusBig: {
    fontFamily: 'Inter_900Black',
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.4,
  },
  bonusPct: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    marginLeft: 1,
  },
  destProgram: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    letterSpacing: -0.3,
  },
  metricsRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: surface.glassBorder,
  },
  metric: {
    flex: 1,
    alignItems: 'flex-start',
  },
  metricLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metricValue: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    marginTop: 3,
    letterSpacing: -0.2,
  },
  metricSub: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: surface.glassBorder,
  },
  reasoningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(34, 211, 238, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.16)',
  },
  reasoningText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  examplesBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: surface.glassBorder,
  },
  examplesTitle: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  exampleDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: aurora.cyan,
  },
  exampleText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    flex: 1,
  },
  exampleBold: {
    color: aurora.cyan,
    fontFamily: 'Inter_700Bold',
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
    fontSize: 18,
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

  formLabel: {
    color: textTokens.muted,
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  programGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  programChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    backgroundColor: surface.glass,
    overflow: 'hidden',
  },
  programChipSelected: {
    borderColor: 'transparent',
  },
  programChipText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  programChipTextSelected: {
    color: '#041220',
    fontFamily: 'Inter_700Bold',
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: semantic.danger,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    flex: 1,
  },

  summaryBox: {
    alignItems: 'flex-start',
  },
  summaryLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: textTokens.primary,
    fontFamily: 'Inter_900Black',
    fontSize: 30,
    letterSpacing: -0.6,
  },
  summaryUnit: {
    color: textTokens.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  summarySub: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginTop: 4,
  },

  resultsHeader: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
});

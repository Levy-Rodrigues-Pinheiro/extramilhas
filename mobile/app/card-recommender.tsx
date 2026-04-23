import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
  useRecommendCards,
  CardRecommendation,
} from '../src/hooks/useCreditCards';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
  AnimatedNumber,
  SwipeableStack,
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

const TIER_COLORS: Record<string, string> = {
  STANDARD: textTokens.muted,
  GOLD: premium.goldLight,
  PLATINUM: '#E2E8F0',
  BLACK: '#0F172A',
};

/**
 * Card-recommender v2 — SIGNATURE SWIPE STACK.
 *
 * Interação: depois do cálculo, cada card aparece como um "boarding pass"
 * físico que o user pode swipe left (pular) ou swipe right (guardar).
 * Tipo Tinder, mas pra cartões premium de milhas.
 *
 * Signature moments:
 *  - Top card tem badge "MELHOR PRO SEU PERFIL" + gradient gold
 *  - Swipe labels "NÃO" / "QUERO" aparecem rotacionadas
 *  - Ao acabar: "revisão" com os favoritos
 */
export default function CardRecommenderScreen() {
  const { t } = useTranslation();
  const recommend = useRecommendCards();
  const [spend, setSpend] = useState('');
  const [income, setIncome] = useState('');
  const [likedCards, setLikedCards] = useState<CardRecommendation[]>([]);
  const [stackFinished, setStackFinished] = useState(false);

  const run = () => {
    const spendNum = parseInt(spend.replace(/\D/g, ''), 10);
    if (!spendNum || spendNum < 500) {
      haptics.warning();
      Alert.alert('Valor baixo', 'Gasto mensal mín R$ 500 pra análise fazer sentido.');
      return;
    }
    const incomeNum = income ? parseInt(income.replace(/\D/g, ''), 10) : undefined;
    haptics.medium();
    recommend.mutate(
      { monthlySpendBrl: spendNum, monthlyIncomeBrl: incomeNum },
      {
        onSuccess: () => {
          haptics.success();
          setLikedCards([]);
          setStackFinished(false);
        },
      },
    );
  };

  const handleSwipeRight = (card: CardRecommendation) => {
    setLikedCards((prev) => [...prev, card]);
  };

  // Renders — combine topRecommendation + alternatives
  const recommendations: CardRecommendation[] = recommend.data
    ? [
        ...(recommend.data.topRecommendation ? [recommend.data.topRecommendation] : []),
        ...(recommend.data.alternatives ?? []),
      ]
    : [];
  const hasResults = recommendations.length > 0;
  const reviewMode = stackFinished && hasResults;

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <PressableScale
              onPress={() => router.back()}
              haptic="tap"
              style={styles.iconBtn}
            >
              <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
            </PressableScale>
            <View style={styles.titleBox}>
              <Text style={styles.title}>Qual cartão pra mim?</Text>
              <Text style={styles.subtitle}>
                {hasResults && !reviewMode
                  ? 'Arraste pra curtir ou pular'
                  : reviewMode
                  ? `${likedCards.length} ${likedCards.length === 1 ? 'favorito' : 'favoritos'}`
                  : 'Análise personalizada'}
              </Text>
            </View>
            {hasResults && (
              <PressableScale
                onPress={() => {
                  haptics.tap();
                  recommend.reset();
                  setLikedCards([]);
                  setStackFinished(false);
                }}
                haptic="none"
                style={styles.iconBtn}
              >
                <Ionicons name="refresh" size={18} color={textTokens.primary} />
              </PressableScale>
            )}
          </View>

          {/* Form (quando não há resultados) */}
          {!hasResults && (
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Animated.View
                entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
              >
                <GlassCard radiusSize="lg" padding={16} glow="cyan">
                  <View style={styles.introRow}>
                    <View style={styles.introIcon}>
                      <Ionicons name="sparkles" size={18} color={aurora.cyan} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.introTitle}>
                        Análise personalizada de cartões
                      </Text>
                      <Text style={styles.introText}>
                        Diz o seu gasto mensal e eu calculo qual cartão dá mais pontos/R$ de
                        retorno líquido (depois de anuidade).
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(100).duration(motion.timing.medium)}
                style={{ marginTop: space.md }}
              >
                <Text style={styles.sectionLabel}>SEU PERFIL</Text>
                <GlassCard radiusSize="lg" padding={14}>
                  <FloatingLabelInput
                    label="Gasto médio mensal (R$)"
                    iconLeft="cart-outline"
                    value={spend}
                    onChangeText={(v) => setSpend(v.replace(/\D/g, ''))}
                    keyboardType="numeric"
                    maxLength={7}
                  />
                  <FloatingLabelInput
                    label="Renda mensal (R$) — opcional"
                    iconLeft="wallet-outline"
                    value={income}
                    onChangeText={(v) => setIncome(v.replace(/\D/g, ''))}
                    keyboardType="numeric"
                    maxLength={8}
                  />
                  <AuroraButton
                    label="Analisar cartões"
                    onPress={run}
                    loading={recommend.isPending}
                    disabled={!spend}
                    variant="primary"
                    size="lg"
                    icon="analytics"
                    iconPosition="left"
                    fullWidth
                    haptic="medium"
                  />
                </GlassCard>
              </Animated.View>

              <Animated.View
                entering={FadeIn.delay(200).duration(motion.timing.medium)}
                style={{ marginTop: space.md }}
              >
                <Text style={styles.footnote}>
                  💡 Análise baseada em CPM médio de 30 dias. Anuidade é descontada do valor
                  estimado em R$.
                </Text>
              </Animated.View>
            </ScrollView>
          )}

          {/* SWIPE STACK — o signature moment */}
          {hasResults && !reviewMode && (
            <View style={{ flex: 1 }}>
              <SwipeableStack
                data={recommendations}
                leftLabel="PULAR"
                rightLabel="SALVAR"
                onSwipeRight={(item) => handleSwipeRight(item)}
                onEnd={() => {
                  setStackFinished(true);
                  return null;
                }}
                renderCard={(rec, index, isTop) => (
                  <RecommendationCard rec={rec} isTop={isTop && index === 0} />
                )}
              />
            </View>
          )}

          {/* Review mode — saved cards */}
          {reviewMode && (
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {likedCards.length === 0 ? (
                <GlassCard radiusSize="xl" padding={0}>
                  <EmptyStateIllustrated
                    variant="search"
                    title="Nenhum favorito salvo"
                    description="Você pulou todos os cartões. Recalcule ou ajuste seus parâmetros."
                    ctaLabel="Recalcular"
                    onCtaPress={() => {
                      recommend.reset();
                      setLikedCards([]);
                      setStackFinished(false);
                    }}
                  />
                </GlassCard>
              ) : (
                <>
                  <Animated.Text
                    entering={FadeInDown.duration(motion.timing.medium)}
                    style={styles.reviewTitle}
                  >
                    Seus favoritos
                  </Animated.Text>
                  <Animated.Text
                    entering={FadeInDown.delay(80).duration(motion.timing.medium)}
                    style={styles.reviewSub}
                  >
                    Toque pra abrir no site oficial
                  </Animated.Text>

                  <View style={{ gap: 12, marginTop: space.md }}>
                    {likedCards.map((rec, i) => (
                      <Animated.View
                        key={rec.card.id}
                        entering={FadeInDown.delay(i * 80).duration(motion.timing.medium)}
                      >
                        <PressableScale
                          onPress={() => {
                            haptics.tap();
                            if (rec.card.officialUrl) {
                              Linking.openURL(rec.card.officialUrl).catch(() => {});
                            }
                          }}
                          haptic="none"
                        >
                          <CompactCard rec={rec} />
                        </PressableScale>
                      </Animated.View>
                    ))}
                  </View>

                  <View style={{ height: space.xl }} />
                  <AuroraButton
                    label="Recalcular com outros valores"
                    onPress={() => {
                      haptics.tap();
                      recommend.reset();
                      setLikedCards([]);
                      setStackFinished(false);
                    }}
                    variant="ghost"
                    size="md"
                    icon="refresh"
                    iconPosition="left"
                    fullWidth
                  />
                </>
              )}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── RecommendationCard (full swipe card) ───────────────────────────────

function RecommendationCard({
  rec,
  isTop,
}: {
  rec: CardRecommendation;
  isTop: boolean;
}) {
  const tierColor = TIER_COLORS[rec.card.tier] ?? textTokens.muted;
  const tierIsGold = rec.card.tier === 'GOLD';
  const tierIsBlack = rec.card.tier === 'BLACK';

  return (
    <View style={cardStyles.card}>
      {/* BG gradient baseado em tier */}
      <LinearGradient
        colors={
          tierIsGold
            ? (gradients.premium as any)
            : tierIsBlack
            ? (['#0F172A', '#1E293B', '#334155'] as [string, string, string])
            : (gradients.aurora as any)
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Darken */}
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Sheen top */}
      <LinearGradient
        colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { height: '45%' }]}
      />

      <View style={cardStyles.content}>
        {/* TOP BADGE */}
        {isTop && (
          <View style={cardStyles.topBadge}>
            <Ionicons name="trophy" size={11} color="#041220" />
            <Text style={cardStyles.topBadgeText}>MELHOR PRO SEU PERFIL</Text>
          </View>
        )}

        {/* Top: tier + issuer */}
        <View style={cardStyles.topRow}>
          <View style={cardStyles.tierChip}>
            <Text style={cardStyles.tierText}>{rec.card.tier}</Text>
          </View>
          <Text style={cardStyles.issuer}>
            {rec.card.issuer} · {rec.card.brand}
          </Text>
        </View>

        {/* Card name (hero) */}
        <Text style={cardStyles.name}>{rec.card.name}</Text>

        {/* ROI big */}
        <View style={cardStyles.roiRow}>
          <AnimatedNumber
            value={rec.breakdown.netRoiBrl}
            format="currency"
            style={cardStyles.roiValue}
          />
          <Text style={cardStyles.roiUnit}>/ano</Text>
        </View>
        <Text style={cardStyles.roiLabel}>RETORNO LÍQUIDO ESTIMADO</Text>

        {/* Breakdown */}
        <View style={cardStyles.breakdown}>
          <BreakdownLine
            label="Pontos/ano"
            value={rec.breakdown.totalPointsYear.toLocaleString('pt-BR')}
          />
          {rec.breakdown.welcomePoints > 0 && (
            <BreakdownLine
              label="+ Welcome"
              value={`+${rec.breakdown.welcomePoints.toLocaleString('pt-BR')}`}
              positive
            />
          )}
          <BreakdownLine
            label="Valor R$"
            value={`R$ ${rec.breakdown.valueBrlYear.toLocaleString('pt-BR', {
              maximumFractionDigits: 0,
            })}`}
          />
          <BreakdownLine
            label="Anuidade"
            value={`−R$ ${rec.breakdown.annualFeeBrl.toLocaleString('pt-BR', {
              maximumFractionDigits: 0,
            })}`}
            negative
          />
        </View>

        {/* Reasoning */}
        <View style={cardStyles.reasoningBox}>
          <Ionicons name="bulb" size={12} color="#FFF" />
          <Text style={cardStyles.reasoning} numberOfLines={3}>
            {rec.reasoning}
          </Text>
        </View>
      </View>

      {/* Border glow */}
      <View
        style={[
          cardStyles.borderGlow,
          {
            borderColor: tierIsGold
              ? 'rgba(255,224,102,0.45)'
              : tierIsBlack
              ? 'rgba(255,255,255,0.25)'
              : 'rgba(255,255,255,0.18)',
          },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

function BreakdownLine({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <View style={cardStyles.breakdownRow}>
      <Text style={cardStyles.breakdownLabel}>{label}</Text>
      <Text
        style={[
          cardStyles.breakdownValue,
          positive && { color: '#FFF', fontFamily: 'Inter_900Black' },
          negative && { color: 'rgba(255,255,255,0.6)' },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── CompactCard (review mode list item) ────────────────────────────────

function CompactCard({ rec }: { rec: CardRecommendation }) {
  const tierColor = TIER_COLORS[rec.card.tier] ?? textTokens.muted;

  return (
    <GlassCard radiusSize="lg" padding={14}>
      <View style={compactStyles.row}>
        <View
          style={[
            compactStyles.tierChip,
            { backgroundColor: `${tierColor}22`, borderColor: `${tierColor}66` },
          ]}
        >
          <Text style={[compactStyles.tierText, { color: tierColor }]}>
            {rec.card.tier}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={compactStyles.name}>{rec.card.name}</Text>
          <Text style={compactStyles.issuer}>{rec.card.issuer}</Text>
        </View>
        <View style={compactStyles.roiCol}>
          <Text style={compactStyles.roiValue}>
            R$ {rec.breakdown.netRoiBrl.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={compactStyles.roiLabel}>ROI/ano</Text>
        </View>
        <Ionicons name="open-outline" size={16} color={textTokens.muted} />
      </View>
    </GlassCard>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 26,
    elevation: 16,
  },
  borderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1.5,
  },
  content: {
    flex: 1,
    padding: space.xl,
    zIndex: 1,
  },
  topBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FFD60A',
    marginBottom: 12,
  },
  topBadgeText: {
    color: '#041220',
    fontFamily: 'Inter_900Black',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  tierChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  tierText: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  issuer: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  name: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.6,
    marginBottom: 20,
  },
  roiRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  roiValue: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.4,
  },
  roiUnit: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  roiLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  breakdown: {
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  breakdownValue: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  reasoningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  reasoning: {
    flex: 1,
    color: '#FFF',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
});

const compactStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierText: {
    fontFamily: 'Inter_900Black',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  name: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  issuer: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
  roiCol: {
    alignItems: 'flex-end',
  },
  roiValue: {
    color: semantic.success,
    fontFamily: 'Inter_900Black',
    fontSize: 14,
    letterSpacing: -0.2,
  },
  roiLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    letterSpacing: 0.4,
    marginTop: 1,
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

  introRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  introIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: aurora.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${aurora.cyan}44`,
  },
  introTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  introText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },

  sectionLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  footnote: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: space.md,
  },

  reviewTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_900Black',
    fontSize: 28,
    letterSpacing: -0.6,
  },
  reviewSub: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    marginTop: 4,
  },
});

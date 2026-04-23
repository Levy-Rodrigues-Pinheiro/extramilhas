import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
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
  useCardCatalog,
  useCompareCards,
  type CompareResult,
} from '../src/hooks/useCreditCards';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
  AnimatedNumber,
  FloatingLabelInput,
  ComparisonBars,
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
 * Card-compare v2 — Apple iPhone Compare style.
 *
 * Signature: ao rodar compare, mostra verdict banner grande com cor,
 * split-screen side-by-side A vs B, + ComparisonBars animadas.
 */
export default function CardCompareScreen() {
  const { t } = useTranslation();
  const { data: catalog, isLoading } = useCardCatalog();
  const compare = useCompareCards();

  const [currentCardId, setCurrentCardId] = useState<string | null>(null);
  const [newCardId, setNewCardId] = useState<string | null>(null);
  const [spend, setSpend] = useState('');

  const run = () => {
    if (!currentCardId || !newCardId) {
      haptics.error();
      Alert.alert('Dados incompletos', 'Selecione os 2 cartões pra comparar.');
      return;
    }
    if (currentCardId === newCardId) {
      haptics.error();
      Alert.alert('Cartões iguais', 'Selecione dois cartões diferentes.');
      return;
    }
    const spendNum = parseInt(spend.replace(/\D/g, ''), 10);
    if (!spendNum || spendNum < 500) {
      haptics.warning();
      Alert.alert('Gasto baixo', 'Informe gasto mensal de pelo menos R$ 500.');
      return;
    }
    haptics.medium();
    compare.mutate({
      currentCardId,
      newCardId,
      monthlySpendBrl: spendNum,
    });
  };

  const result = compare.data;

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
              <Text style={styles.title}>Comparar cartões</Text>
              <Text style={styles.subtitle}>Lado a lado, números transparentes</Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Intro */}
            <Animated.View
              entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
            >
              <GlassCard radiusSize="lg" padding={16} glow="cyan">
                <View style={styles.introRow}>
                  <View style={styles.introIcon}>
                    <Ionicons name="swap-horizontal" size={18} color={aurora.cyan} />
                  </View>
                  <Text style={styles.introText}>
                    Compare o ROI líquido do seu cartão atual vs um que você está
                    considerando. Ajuda a decidir se vale migrar.
                  </Text>
                </View>
              </GlassCard>
            </Animated.View>

            {isLoading ? (
              <Text style={styles.noteText}>Carregando catálogo...</Text>
            ) : !catalog || catalog.length < 2 ? (
              <Text style={styles.noteText}>
                Catálogo insuficiente — precisa de pelo menos 2 cartões.
              </Text>
            ) : (
              <>
                {/* Seleção A */}
                <Animated.View
                  entering={FadeInDown.delay(100).duration(motion.timing.medium)}
                  style={{ marginTop: space.md }}
                >
                  <Text style={styles.sectionLabel}>
                    <View style={[styles.dot, { backgroundColor: aurora.cyan }]} />{' '}
                    CARTÃO ATUAL
                  </Text>
                  <CardPicker
                    cards={catalog}
                    selectedId={currentCardId}
                    onSelect={setCurrentCardId}
                    exclude={newCardId}
                    accent="cyan"
                  />
                </Animated.View>

                {/* VS separator */}
                <Animated.View
                  entering={FadeIn.delay(180).duration(motion.timing.medium)}
                  style={styles.vsRow}
                >
                  <View style={styles.vsLine} />
                  <View style={styles.vsBadge}>
                    <Text style={styles.vsText}>VS</Text>
                  </View>
                  <View style={styles.vsLine} />
                </Animated.View>

                {/* Seleção B */}
                <Animated.View entering={FadeInDown.delay(220).duration(motion.timing.medium)}>
                  <Text style={styles.sectionLabel}>
                    <View style={[styles.dot, { backgroundColor: aurora.magenta }]} />{' '}
                    CARTÃO NOVO
                  </Text>
                  <CardPicker
                    cards={catalog}
                    selectedId={newCardId}
                    onSelect={setNewCardId}
                    exclude={currentCardId}
                    accent="magenta"
                  />
                </Animated.View>

                {/* Spend input + submit */}
                <Animated.View
                  entering={FadeInDown.delay(300).duration(motion.timing.medium)}
                  style={{ marginTop: space.md }}
                >
                  <Text style={styles.sectionLabel}>SEU GASTO MENSAL</Text>
                  <GlassCard radiusSize="lg" padding={14}>
                    <FloatingLabelInput
                      label="Gasto médio mensal (R$)"
                      iconLeft="cart-outline"
                      value={spend}
                      onChangeText={(v) => setSpend(v.replace(/\D/g, ''))}
                      keyboardType="numeric"
                      maxLength={7}
                    />
                    <AuroraButton
                      label="Comparar"
                      onPress={run}
                      loading={compare.isPending}
                      disabled={!currentCardId || !newCardId || !spend}
                      variant="primary"
                      size="lg"
                      icon="swap-horizontal"
                      iconPosition="left"
                      fullWidth
                      haptic="medium"
                    />
                  </GlassCard>
                </Animated.View>
              </>
            )}

            {/* Result */}
            {result && (
              <Animated.View
                entering={FadeInDown.duration(motion.timing.long).springify().damping(18)}
                style={{ marginTop: space.xl }}
              >
                {/* Verdict card */}
                <VerdictCard result={result} />

                {/* Comparison bars */}
                <View style={{ marginTop: space.lg }}>
                  <Text style={styles.sectionLabel}>COMPARAÇÃO DETALHADA</Text>
                  <GlassCard radiusSize="lg" padding={16}>
                    <ComparisonBars
                      labelA={shortName(result.current.card.name)}
                      labelB={shortName(result.new.card.name)}
                      rows={[
                        {
                          label: 'ROI líquido/ano',
                          a: result.current.netRoiBrl,
                          b: result.new.netRoiBrl,
                          format: 'currency',
                          betterIs: 'higher',
                        },
                        {
                          label: 'Pontos/ano',
                          a: result.current.totalPointsYear,
                          b: result.new.totalPointsYear,
                          format: 'integer',
                          betterIs: 'higher',
                        },
                        {
                          label: 'Anuidade',
                          a: result.current.annualFeeBrl,
                          b: result.new.annualFeeBrl,
                          format: 'currency',
                          betterIs: 'lower',
                        },
                        {
                          label: 'Valor em R$',
                          a: result.current.valueBrlYear,
                          b: result.new.valueBrlYear,
                          format: 'currency',
                          betterIs: 'higher',
                        },
                      ]}
                    />
                  </GlassCard>
                </View>

                {/* Disclaimer */}
                <GlassCard radiusSize="md" padding={12} style={{ marginTop: space.md }}>
                  <View style={styles.disclaimerRow}>
                    <Ionicons name="information-circle" size={14} color={textTokens.muted} />
                    <Text style={styles.disclaimerText}>
                      Estimativas baseadas em CPM médio. Anuidade pode variar por convênio, e
                      welcome bonus tem condições específicas do emissor.
                    </Text>
                  </View>
                </GlassCard>
              </Animated.View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── VerdictCard ────────────────────────────────────────────────────────

function VerdictCard({ result }: { result: CompareResult }) {
  const rec = result.comparison.recommendation;
  const isSwitch = rec === 'SWITCH';
  const isStay = rec === 'STAY';

  const color = isSwitch ? semantic.success : isStay ? semantic.danger : textTokens.muted;
  const bgGradient: [string, string, string] = isSwitch
    ? ['#0F8A3C', '#30D158', '#66E88A']
    : isStay
    ? ['#A30014', '#FF453A', '#FF7A73']
    : (['#1C1C1E', '#2C2C2E', '#3A3A3C'] as [string, string, string]);
  const label = isSwitch ? 'VALE MIGRAR' : isStay ? 'FICA NO ATUAL' : 'EMPATE';
  const icon = isSwitch ? 'trending-up' : isStay ? 'shield-checkmark' : 'remove';

  return (
    <View style={verdictStyles.card}>
      <LinearGradient
        colors={bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.5)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { height: '45%' }]}
      />

      <View style={verdictStyles.content}>
        <View style={verdictStyles.iconCircle}>
          <Ionicons name={icon as any} size={24} color="#FFF" />
        </View>
        <Text style={verdictStyles.label}>VEREDITO</Text>
        <Text style={verdictStyles.title}>{label}</Text>
        {result.comparison.deltaPercent !== null && (
          <View style={verdictStyles.deltaRow}>
            <Ionicons
              name={result.comparison.deltaPercent > 0 ? 'arrow-up' : 'arrow-down'}
              size={14}
              color="#FFF"
            />
            <AnimatedNumber
              value={Math.abs(result.comparison.deltaPercent)}
              format="decimal"
              decimals={1}
              suffix="%"
              style={verdictStyles.deltaText}
            />
            <Text style={verdictStyles.deltaLabel}>de variação</Text>
          </View>
        )}
        <Text style={verdictStyles.verdictBody}>{result.comparison.verdict}</Text>
      </View>
    </View>
  );
}

// ─── CardPicker ─────────────────────────────────────────────────────────

function CardPicker({
  cards,
  selectedId,
  onSelect,
  exclude,
  accent,
}: {
  cards: Array<{ id: string; name: string; issuer: string; tier: string }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  exclude: string | null;
  accent: 'cyan' | 'magenta';
}) {
  const accentColor = accent === 'cyan' ? aurora.cyan : aurora.magenta;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', gap: 8, paddingRight: space.md }}>
        {cards
          .filter((c) => c.id !== exclude)
          .map((c) => {
            const selected = selectedId === c.id;
            return (
              <PressableScale
                key={c.id}
                onPress={() => {
                  haptics.select();
                  onSelect(c.id);
                }}
                haptic="none"
              >
                <View
                  style={[
                    pickerStyles.chip,
                    selected && {
                      borderColor: accentColor,
                      backgroundColor: `${accentColor}12`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      pickerStyles.name,
                      selected && { color: accentColor, fontFamily: 'Inter_700Bold' },
                    ]}
                  >
                    {c.name}
                  </Text>
                  <Text style={pickerStyles.issuer}>
                    {c.issuer} · {c.tier}
                  </Text>
                  {selected && (
                    <View
                      style={[
                        pickerStyles.selectedDot,
                        { backgroundColor: accentColor },
                      ]}
                    />
                  )}
                </View>
              </PressableScale>
            );
          })}
      </View>
    </ScrollView>
  );
}

function shortName(full: string): string {
  // Pega até 2 palavras significativas
  const clean = full.replace(/\(.*?\)/g, '').trim();
  const parts = clean.split(' ').filter((p) => p.length > 2);
  return parts.slice(0, 2).join(' ');
}

// ─── Styles ─────────────────────────────────────────────────────────────

const verdictStyles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 14,
  },
  content: {
    padding: space.xl,
    alignItems: 'center',
    zIndex: 1,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    marginBottom: 12,
  },
  label: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  title: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 36,
    letterSpacing: -1.2,
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'center',
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  deltaText: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 16,
  },
  deltaLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  verdictBody: {
    color: '#FFF',
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 19,
  },
});

const pickerStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    backgroundColor: surface.glass,
    minWidth: 140,
    position: 'relative',
  },
  name: {
    color: textTokens.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    letterSpacing: -0.1,
  },
  issuer: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 3,
  },
  selectedDot: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
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

  introRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  introText: {
    flex: 1,
    color: textTokens.primary,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 19,
  },

  sectionLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: space.md,
  },
  vsLine: {
    flex: 1,
    height: 1,
    backgroundColor: surface.separator,
  },
  vsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderColor: surface.glassBorder,
  },
  vsText: {
    color: textTokens.primary,
    fontFamily: 'Inter_900Black',
    fontSize: 11,
    letterSpacing: 1.2,
  },

  noteText: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    textAlign: 'center',
    marginTop: space.xxl,
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

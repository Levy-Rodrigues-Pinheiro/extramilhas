import React, { useEffect, useState } from 'react';
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
import Animated, {
  FadeInDown,
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useCreateBonusReport } from '../src/hooks/useBonusReports';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
  FloatingLabelInput,
  AnimatedCheckmark,
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

/**
 * Report-bonus v2 — form delicious + success state com AnimatedCheckmark.
 *
 * Signature moment: submit → AnimatedCheckmark draws line in circle +
 * confetti subtle + impact message "x usuários vão ser notificados".
 */
export default function ReportBonusScreen() {
  const [from, setFrom] = useState('livelo');
  const [to, setTo] = useState('smiles');
  const [bonus, setBonus] = useState('');
  const [expires, setExpires] = useState('');
  const [notes, setNotes] = useState('');
  const create = useCreateBonusReport();
  const [submitted, setSubmitted] = useState<{
    message: string;
    isDuplicate: boolean;
  } | null>(null);

  const handleSubmit = async () => {
    const bonusNum = parseFloat(bonus.replace(',', '.'));
    if (isNaN(bonusNum) || bonusNum < 1 || bonusNum > 500) {
      haptics.error();
      Alert.alert('Bônus inválido', 'Digite um número entre 1 e 500.');
      return;
    }
    if (from === to) {
      haptics.error();
      Alert.alert('Programas iguais', 'Origem e destino não podem ser o mesmo programa.');
      return;
    }
    try {
      haptics.medium();
      const result = await create.mutateAsync({
        fromProgramSlug: from,
        toProgramSlug: to,
        bonusPercent: bonusNum,
        expiresAt: expires.match(/^\d{4}-\d{2}-\d{2}$/) ? expires : undefined,
        notes: notes || undefined,
      });
      setSubmitted({ message: result.message, isDuplicate: result.isDuplicate });
      if (result.isDuplicate) haptics.warning();
      else haptics.success();
    } catch (e: any) {
      haptics.error();
      Alert.alert('Erro', e?.response?.data?.message || e?.message || 'Falha ao enviar');
    }
  };

  // Success state
  if (submitted) {
    return (
      <AuroraBackground intensity="hero" style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {/* Close btn */}
          <View style={styles.successHeader}>
            <PressableScale
              onPress={() => {
                haptics.tap();
                router.back();
              }}
              haptic="none"
              style={styles.iconBtn}
            >
              <Ionicons name="close" size={20} color={textTokens.primary} />
            </PressableScale>
          </View>

          <View style={styles.successWrap}>
            {/* Animated checkmark hero */}
            <Animated.View entering={FadeIn.duration(300)}>
              <AnimatedCheckmark
                trigger={true}
                size={120}
                color={submitted.isDuplicate ? premium.goldLight : semantic.success}
                strokeWidth={7}
              />
            </Animated.View>

            <Animated.Text
              entering={FadeInUp.delay(400).duration(500)}
              style={styles.successTitle}
            >
              {submitted.isDuplicate ? 'Já temos esse!' : 'Obrigado! 🙏'}
            </Animated.Text>

            <Animated.Text
              entering={FadeInUp.delay(550).duration(500)}
              style={styles.successText}
            >
              {submitted.message}
            </Animated.Text>

            {!submitted.isDuplicate && (
              <Animated.View
                entering={FadeInUp.delay(750).duration(500)}
                style={{ width: '100%', marginTop: space.xl }}
              >
                <GlassCard radiusSize="lg" padding={16} glow="cyan" style={styles.impactBox}>
                  <View style={styles.impactIcon}>
                    <Ionicons name="people" size={18} color={aurora.cyan} />
                  </View>
                  <Text style={styles.impactText}>
                    Quando admin validar,{' '}
                    <Text style={styles.impactBold}>todo mundo no app recebe push.</Text> Seu
                    report vira oportunidade pra quem tem saldo nesse programa.
                  </Text>
                </GlassCard>
              </Animated.View>
            )}

            <Animated.View
              entering={FadeInUp.delay(900).duration(500)}
              style={{ width: '100%', marginTop: space.xl, gap: 10 }}
            >
              <AuroraButton
                label="Ver ranking de reporters"
                onPress={() => {
                  haptics.tap();
                  router.replace('/leaderboard' as any);
                }}
                variant="primary"
                size="lg"
                icon="trophy"
                iconPosition="left"
                fullWidth
                haptic="none"
              />
              <AuroraButton
                label="Reportar outro"
                onPress={() => {
                  haptics.tap();
                  setSubmitted(null);
                  setBonus('');
                  setExpires('');
                  setNotes('');
                }}
                variant="ghost"
                size="md"
                fullWidth
                haptic="none"
              />
            </Animated.View>
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  // Form state
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
              <Text style={styles.title}>Reportar bônus</Text>
              <Text style={styles.subtitle}>Ajude a comunidade</Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Intro card */}
            <Animated.View
              entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
            >
              <GlassCard radiusSize="lg" padding={16} glow="cyan">
                <View style={styles.introRow}>
                  <View style={styles.introIcon}>
                    <Ionicons name="megaphone" size={18} color={aurora.cyan} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.introTitle}>
                      Viu um bônus em algum lugar?
                    </Text>
                    <Text style={styles.introText}>
                      Newsletter, site, telegram... reporta aqui. Admin valida, app avisa
                      todo mundo, você sobe no ranking.
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>

            {/* Origem → Destino */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(motion.timing.medium)}
              style={{ marginTop: space.md }}
            >
              <Text style={styles.sectionLabel}>ORIGEM → DESTINO</Text>

              <GlassCard radiusSize="lg" padding={14}>
                <Text style={styles.fieldLabel}>De qual programa</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: space.md }}
                >
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {PROGRAMS.map((p) => (
                      <ProgramChip
                        key={`from-${p.slug}`}
                        label={p.name}
                        selected={from === p.slug}
                        onPress={() => setFrom(p.slug)}
                      />
                    ))}
                  </View>
                </ScrollView>

                <View style={styles.arrowRow}>
                  <View style={styles.arrowLine} />
                  <View style={styles.arrowIconWrap}>
                    <Ionicons name="arrow-down" size={14} color={aurora.cyan} />
                  </View>
                  <View style={styles.arrowLine} />
                </View>

                <Text style={styles.fieldLabel}>Para qual programa</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {PROGRAMS.map((p) => (
                      <ProgramChip
                        key={`to-${p.slug}`}
                        label={p.name}
                        selected={to === p.slug}
                        onPress={() => setTo(p.slug)}
                      />
                    ))}
                  </View>
                </ScrollView>
              </GlassCard>
            </Animated.View>

            {/* Details */}
            <Animated.View
              entering={FadeInDown.delay(200).duration(motion.timing.medium)}
              style={{ marginTop: space.md }}
            >
              <Text style={styles.sectionLabel}>DETALHES</Text>
              <GlassCard radiusSize="lg" padding={14}>
                <FloatingLabelInput
                  label="Bônus % (1 a 500)"
                  iconLeft="trending-up-outline"
                  value={bonus}
                  onChangeText={(v) => setBonus(v.replace(/[^0-9.,]/g, ''))}
                  keyboardType="decimal-pad"
                  maxLength={6}
                />

                <FloatingLabelInput
                  label="Expira em (aaaa-mm-dd) — opcional"
                  iconLeft="calendar-outline"
                  value={expires}
                  onChangeText={setExpires}
                  maxLength={10}
                />

                <FloatingLabelInput
                  label="Observações (link, fonte...) — opcional"
                  iconLeft="document-text-outline"
                  value={notes}
                  onChangeText={setNotes}
                  maxLength={300}
                  multiline
                />
              </GlassCard>
            </Animated.View>

            {/* Submit */}
            <Animated.View
              entering={FadeInDown.delay(300).duration(motion.timing.medium)}
              style={{ marginTop: space.xl }}
            >
              <AuroraButton
                label="Enviar report"
                onPress={handleSubmit}
                loading={create.isPending}
                disabled={!bonus || from === to}
                variant="primary"
                size="lg"
                icon="send"
                iconPosition="right"
                fullWidth
                haptic="medium"
              />
            </Animated.View>

            <Text style={styles.footnote}>
              Reports duplicados (mesma parceria) são dedupado e você não ganha ponto dobrado.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── ProgramChip ────────────────────────────────────────────────────────

function ProgramChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={() => {
        haptics.select();
        onPress();
      }}
      haptic="none"
    >
      <View style={[styles.chip, selected && styles.chipSelected]}>
        {selected && (
          <LinearGradient
            colors={gradients.auroraCyanMagenta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
          />
        )}
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: 8,
    gap: 8,
  },
  successHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: space.md,
    paddingVertical: 8,
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
  fieldLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    backgroundColor: surface.glass,
    overflow: 'hidden',
  },
  chipSelected: {
    borderColor: 'transparent',
  },
  chipText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  chipTextSelected: {
    color: '#041220',
    fontFamily: 'Inter_700Bold',
  },

  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 10,
  },
  arrowLine: {
    flex: 1,
    height: 1,
    backgroundColor: surface.separator,
  },
  arrowIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: aurora.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${aurora.cyan}66`,
  },

  footnote: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    textAlign: 'center',
    marginTop: space.lg,
    paddingHorizontal: space.xl,
    lineHeight: 16,
  },

  // Success
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    paddingBottom: space.hero,
  },
  successTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_900Black',
    fontSize: 32,
    letterSpacing: -0.8,
    textAlign: 'center',
    marginTop: space.xl,
  },
  successText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: space.md,
  },
  impactBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  impactIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: aurora.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${aurora.cyan}44`,
  },
  impactText: {
    flex: 1,
    color: textTokens.primary,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  impactBold: {
    fontFamily: 'Inter_700Bold',
    color: aurora.cyan,
  },
});

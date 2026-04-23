import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import { usePrograms } from '../src/hooks/usePrograms';
import { useUpdateBalances } from '../src/hooks/useProfile';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
  AnimatedNumber,
  ConfettiBurst,
  FloatingLabelInput,
  type ConfettiBurstHandle,
  aurora,
  premium,
  system,
  semantic,
  surface,
  text as textTokens,
  space,
  gradients,
  motion,
  haptics,
} from '../src/components/primitives';

/**
 * Welcome quiz v2 — 5 steps com stagger + confetti reveal no final.
 */
export default function WelcomeQuizScreen() {
  const { data: programs, isLoading: programsLoading } = usePrograms();
  const updateBalances = useUpdateBalances();
  const confetti = useRef<ConfettiBurstHandle>(null);

  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [savedValue, setSavedValue] = useState<number | null>(null);

  // Disparar confetti quando entra no step 4 com savedValue
  useEffect(() => {
    if (step === 4 && savedValue !== null && savedValue > 0) {
      const t = setTimeout(() => {
        confetti.current?.burst();
      }, 400);
      return () => clearTimeout(t);
    }
  }, [step, savedValue]);

  const toggleProgram = (id: string) => {
    haptics.select();
    setSelectedPrograms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveBalances = async () => {
    setSubmitting(true);
    haptics.medium();
    try {
      const payload = Array.from(selectedPrograms).map((programId) => ({
        programId,
        balance: parseInt((balances[programId] || '0').replace(/\D/g, ''), 10) || 0,
      }));
      const withBalance = payload.filter((p) => p.balance > 0);
      if (withBalance.length > 0) {
        await updateBalances.mutateAsync({ balances: withBalance });
        const total = programs
          ? withBalance.reduce((acc, b) => {
              const prog = programs.find((p) => p.id === b.programId);
              const cpm = (prog as any)?.avgCpmCurrent ?? 25;
              return acc + (b.balance / 1000) * cpm;
            }, 0)
          : 0;
        setSavedValue(total);
      }
      setStep(3);
    } catch (err) {
      haptics.error();
      Alert.alert('Erro', 'Não foi possível salvar seu saldo. Tente novamente ou pula.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestNotifications = async () => {
    setSubmitting(true);
    haptics.tap();
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    } catch {
      /* user pode negar */
    } finally {
      setSubmitting(false);
      setStep(4);
    }
  };

  const handleFinish = () => {
    haptics.success();
    router.replace('/(tabs)' as any);
  };

  const skipAll = () => {
    haptics.tap();
    router.replace('/(tabs)' as any);
  };

  return (
    <AuroraBackground intensity={step === 4 ? 'celebration' : 'hero'} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ConfettiBurst ref={confetti} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Progress bar */}
          <View style={styles.progressRow}>
            {[1, 2, 3, 4].map((n) => {
              const active = n <= step && step > 0;
              return (
                <View key={n} style={styles.progressStepWrap}>
                  {active ? (
                    <LinearGradient
                      colors={gradients.auroraCyanMagenta}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.progressStepFill}
                    />
                  ) : (
                    <View style={styles.progressStepBase} />
                  )}
                </View>
              );
            })}
            <PressableScale onPress={skipAll} haptic="none" style={styles.skipBtn}>
              <Text style={styles.skipText}>Pular</Text>
            </PressableScale>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* STEP 0 — Intro */}
            {step === 0 && (
              <Animated.View
                key="step-0"
                entering={FadeIn.duration(motion.timing.medium)}
              >
                <View style={styles.emojiWrap}>
                  <Text style={styles.emoji}>💡</Text>
                </View>
                <Text style={styles.title}>O que a gente faz</Text>
                <Text style={styles.subtitle}>
                  Milhas valem diferente em cada programa. Quando Livelo oferece 100% de bônus pra
                  transferir pra Smiles, cada 1.000 pontos viram{' '}
                  <Text style={styles.highlight}>2.000 milhas</Text>. É o que a gente chama de{' '}
                  <Text style={styles.highlight}>arbitragem</Text> — ganho real, em R$.
                </Text>

                <GlassCard radiusSize="lg" padding={16} style={styles.introBox}>
                  <IntroLine icon="flash" text="Notificamos quando um bônus aparece" />
                  <IntroLine icon="calculator" text="Calculamos quanto VOCÊ ganha em R$" />
                  <IntroLine icon="gift" text="Missões, ranking, Premium grátis" />
                </GlassCard>

                <AuroraButton
                  label="Entendi, vamos configurar"
                  onPress={() => {
                    haptics.tap();
                    setStep(1);
                  }}
                  variant="primary"
                  size="lg"
                  icon="arrow-forward"
                  iconPosition="right"
                  fullWidth
                  style={{ marginTop: space.xl }}
                />

                <Text style={styles.footnote}>Leva 30 segundos. Pode pular.</Text>
              </Animated.View>
            )}

            {/* STEP 1 — Programs */}
            {step === 1 && (
              <Animated.View
                key="step-1"
                entering={SlideInRight.duration(motion.timing.medium)}
                exiting={SlideOutLeft.duration(motion.timing.base)}
              >
                <View style={styles.emojiWrap}>
                  <Text style={styles.emoji}>👋</Text>
                </View>
                <Text style={styles.title}>Em quais programas você tem milhas?</Text>
                <Text style={styles.subtitle}>
                  Selecione os que você usa. A gente mostra só os bônus relevantes.
                </Text>

                {programsLoading ? (
                  <Text style={styles.hint}>Carregando programas...</Text>
                ) : (
                  <View style={styles.chipsWrap}>
                    {programs?.map((p) => {
                      const selected = selectedPrograms.has(p.id);
                      return (
                        <PressableScale
                          key={p.id}
                          onPress={() => toggleProgram(p.id)}
                          haptic="none"
                        >
                          <View style={[styles.chip, selected && styles.chipActive]}>
                            {selected && (
                              <LinearGradient
                                colors={gradients.auroraCyanMagenta}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
                              />
                            )}
                            <Text
                              style={[styles.chipText, selected && styles.chipTextActive]}
                            >
                              {p.name}
                            </Text>
                            {selected && (
                              <Ionicons name="checkmark-circle" size={15} color="#041220" />
                            )}
                          </View>
                        </PressableScale>
                      );
                    })}
                  </View>
                )}

                <AuroraButton
                  label={selectedPrograms.size > 0 ? 'Continuar' : 'Não uso nenhum ainda'}
                  onPress={() =>
                    selectedPrograms.size > 0
                      ? setStep(2)
                      : router.replace('/(tabs)' as any)
                  }
                  variant="primary"
                  size="lg"
                  icon="arrow-forward"
                  iconPosition="right"
                  fullWidth
                  style={{ marginTop: space.xl }}
                  haptic="tap"
                />
              </Animated.View>
            )}

            {/* STEP 2 — Balances */}
            {step === 2 && (
              <Animated.View
                key="step-2"
                entering={SlideInRight.duration(motion.timing.medium)}
                exiting={SlideOutLeft.duration(motion.timing.base)}
              >
                <View style={styles.emojiWrap}>
                  <Text style={styles.emoji}>💰</Text>
                </View>
                <Text style={styles.title}>Quanto você tem?</Text>
                <Text style={styles.subtitle}>
                  A gente calcula valor real em R$ da sua carteira. Pode deixar em branco se não
                  souber.
                </Text>

                <View style={{ marginTop: space.lg, gap: 10 }}>
                  {programs
                    ?.filter((p) => selectedPrograms.has(p.id))
                    .map((p, i) => (
                      <Animated.View
                        key={p.id}
                        entering={FadeInUp.delay(i * 50).duration(motion.timing.short)}
                      >
                        <GlassCard radiusSize="md" padding={12} style={styles.balanceRow}>
                          <Text style={styles.balanceLabel}>{p.name}</Text>
                          <TextInput_
                            value={balances[p.id] || ''}
                            onChangeText={(v: string) =>
                              setBalances((prev) => ({
                                ...prev,
                                [p.id]: v.replace(/\D/g, ''),
                              }))
                            }
                          />
                          <Text style={styles.balanceSuffix}>pts</Text>
                        </GlassCard>
                      </Animated.View>
                    ))}
                </View>

                <AuroraButton
                  label={submitting ? 'Salvando...' : 'Continuar'}
                  onPress={handleSaveBalances}
                  loading={submitting}
                  variant="primary"
                  size="lg"
                  icon="arrow-forward"
                  iconPosition="right"
                  fullWidth
                  style={{ marginTop: space.xl }}
                  haptic="medium"
                />
              </Animated.View>
            )}

            {/* STEP 3 — Notifications */}
            {step === 3 && (
              <Animated.View
                key="step-3"
                entering={SlideInRight.duration(motion.timing.medium)}
                exiting={SlideOutLeft.duration(motion.timing.base)}
              >
                <View style={styles.emojiWrap}>
                  <Text style={styles.emoji}>🔔</Text>
                </View>
                <Text style={styles.title}>Te avisar quando aparecer?</Text>
                <Text style={styles.subtitle}>
                  Bônus aparecem e somem em horas. Notificamos no momento — você nunca mais perde.
                </Text>

                <GlassCard radiusSize="lg" padding={16} style={styles.benefitsBox}>
                  <Benefit icon="flash" text="Alerta instantâneo quando aparece um bônus novo" />
                  <Benefit
                    icon="notifications-circle"
                    text="Spam zero — no máximo 2-3 pushes por semana"
                  />
                  <Benefit icon="shield-checkmark" text="Pode desativar a qualquer momento" />
                </GlassCard>

                <AuroraButton
                  label={submitting ? 'Configurando...' : 'Ativar notificações'}
                  onPress={handleRequestNotifications}
                  loading={submitting}
                  variant="apple"
                  size="lg"
                  icon="notifications"
                  iconPosition="left"
                  fullWidth
                  style={{ marginTop: space.xl }}
                  haptic="medium"
                />
                <PressableScale
                  onPress={() => setStep(4)}
                  haptic="tap"
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryText}>Agora não</Text>
                </PressableScale>
              </Animated.View>
            )}

            {/* STEP 4 — Final reveal */}
            {step === 4 && (
              <Animated.View
                key="step-4"
                entering={FadeIn.duration(motion.timing.medium)}
              >
                <View style={styles.emojiWrap}>
                  <Animated.Text
                    entering={FadeInDown.duration(motion.timing.long).springify().damping(14).stiffness(200)}
                    style={styles.emojiBig}
                  >
                    🚀
                  </Animated.Text>
                </View>
                <Text style={styles.title}>Tudo pronto!</Text>

                {savedValue !== null && savedValue > 0 ? (
                  <Animated.View
                    entering={FadeInUp.delay(200).duration(motion.timing.long).springify().damping(20)}
                  >
                    <View style={styles.revealCard}>
                      <LinearGradient
                        colors={gradients.aurora}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                      />
                      <LinearGradient
                        colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                      />
                      <LinearGradient
                        colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[StyleSheet.absoluteFill, { height: '50%', borderRadius: 24 }]}
                      />

                      <View style={styles.revealContent}>
                        <Text style={styles.revealLabel}>✨ SUA CARTEIRA VALE</Text>
                        <AnimatedNumber
                          value={savedValue}
                          format="currency"
                          style={styles.revealValue}
                          duration={motion.timing.long}
                        />
                        <Text style={styles.revealHint}>
                          Baseado no CPM médio atual de cada programa
                        </Text>
                      </View>
                    </View>
                  </Animated.View>
                ) : (
                  <Text style={styles.subtitle}>
                    Já pode explorar. Quando cadastrar saldos, calculamos quanto sua carteira vale
                    em R$.
                  </Text>
                )}

                <AuroraButton
                  label="Entrar no app"
                  onPress={handleFinish}
                  variant="primary"
                  size="lg"
                  icon="rocket"
                  iconPosition="right"
                  fullWidth
                  style={{ marginTop: space.xl }}
                  haptic="success"
                />
              </Animated.View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function IntroLine({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.introLine}>
      <View style={styles.introIcon}>
        <Ionicons name={icon} size={13} color={aurora.cyan} />
      </View>
      <Text style={styles.introLineText}>{text}</Text>
    </View>
  );
}

function Benefit({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.benefit}>
      <View style={styles.benefitIcon}>
        <Ionicons name={icon} size={15} color={aurora.cyan} />
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

/** Inline input — evita forked TextInput do primitive quando só precisamos numeric */
import { TextInput } from 'react-native';
function TextInput_({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType="numeric"
      placeholder="0"
      placeholderTextColor={textTokens.dim}
      maxLength={10}
      selectionColor={aurora.cyan}
      style={styles.balanceInput}
    />
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: 12,
  },
  progressStepWrap: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressStepFill: {
    flex: 1,
    borderRadius: 2,
  },
  progressStepBase: {
    flex: 1,
    borderRadius: 2,
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderColor: surface.glassBorder,
  },
  skipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  skipText: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },

  content: {
    padding: space.xl,
    paddingBottom: 60,
  },

  emojiWrap: {
    alignItems: 'center',
    marginTop: space.lg,
    marginBottom: space.md,
  },
  emoji: {
    fontSize: 56,
    textAlign: 'center',
  },
  emojiBig: {
    fontSize: 72,
    textAlign: 'center',
  },
  title: {
    color: textTokens.primary,
    fontFamily: 'Inter_900Black',
    fontSize: 28,
    letterSpacing: -0.6,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 34,
  },
  subtitle: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  highlight: {
    color: aurora.cyan,
    fontFamily: 'Inter_700Bold',
  },
  footnote: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
  hint: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    textAlign: 'center',
    marginTop: space.md,
  },

  introBox: {
    marginTop: space.xl,
    gap: 12,
  },
  introLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  introIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: aurora.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introLineText: {
    color: textTokens.primary,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    flex: 1,
  },

  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: space.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    overflow: 'hidden',
  },
  chipActive: {
    borderColor: 'transparent',
  },
  chipText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#041220',
    fontFamily: 'Inter_700Bold',
  },

  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  balanceLabel: {
    color: textTokens.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    flex: 1,
  },
  balanceInput: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    minWidth: 90,
    textAlign: 'right',
    padding: 0,
  },
  balanceSuffix: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },

  benefitsBox: {
    marginTop: space.lg,
    gap: 12,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: aurora.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    color: textTokens.primary,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  revealCard: {
    marginTop: space.xl,
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 180,
    shadowColor: aurora.magenta,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  revealContent: {
    padding: space.xl,
    alignItems: 'center',
    zIndex: 1,
  },
  revealLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  revealValue: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -1.4,
    marginVertical: 8,
    textAlign: 'center',
  },
  revealHint: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    textAlign: 'center',
  },

  secondaryBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryText: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
});

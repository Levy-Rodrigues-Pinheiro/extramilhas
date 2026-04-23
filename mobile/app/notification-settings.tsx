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
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  useNotificationPrefs,
  useUpdateNotificationPrefs,
  useStartWhatsAppVerify,
  useConfirmWhatsAppVerify,
} from '../src/hooks/useNotificationPrefs';
import {
  AuroraBackground,
  AuroraButton,
  SettingsGroup,
  SettingsRow,
  GlassCard,
  PressableScale,
  FloatingLabelInput,
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

export default function NotificationSettingsScreen() {
  const prefs = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();
  const startVerify = useStartWhatsAppVerify();
  const confirmVerify = useConfirmWhatsAppVerify();

  const [verifyStep, setVerifyStep] = useState<'idle' | 'phone' | 'code'>('idle');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  const p = prefs.data;
  const selectedPairs = new Set(p?.notifyProgramPairs || []);

  const togglePair = async (pair: string) => {
    haptics.select();
    const next = new Set(selectedPairs);
    if (next.has(pair)) next.delete(pair);
    else next.add(pair);
    await update.mutateAsync({ notifyProgramPairs: Array.from(next) });
  };

  const toggleBonus = async (v: boolean) => {
    await update.mutateAsync({ notifyBonus: v });
  };

  const toggleWhatsApp = async (v: boolean) => {
    if (v && !p?.whatsappVerified) {
      haptics.tap();
      setVerifyStep('phone');
      return;
    }
    try {
      await update.mutateAsync({ notifyWhatsApp: v });
    } catch (err: any) {
      haptics.error();
      Alert.alert('Erro', err?.response?.data?.message || 'Falha ao atualizar');
    }
  };

  const handleStartVerify = async () => {
    try {
      haptics.medium();
      await startVerify.mutateAsync(phone);
      setVerifyStep('code');
    } catch (err: any) {
      haptics.error();
      Alert.alert('Erro', err?.response?.data?.message || 'Número inválido');
    }
  };

  const handleConfirmVerify = async () => {
    try {
      await confirmVerify.mutateAsync(code);
      haptics.success();
      setVerifyStep('idle');
      setCode('');
      setPhone('');
      Alert.alert('Pronto!', 'WhatsApp verificado — vamos te avisar por lá também.');
    } catch (err: any) {
      haptics.error();
      Alert.alert('Código incorreto', err?.response?.data?.message || 'Tenta de novo');
    }
  };

  const SUGGESTED_PAIRS: Array<{ label: string; pair: string; color: string }> = [
    { label: 'Livelo → Smiles', pair: 'livelo:smiles', color: aurora.cyan },
    { label: 'Esfera → Smiles', pair: 'esfera:smiles', color: aurora.magenta },
    { label: 'Livelo → Latam Pass', pair: 'livelo:latampass', color: premium.goldLight },
    { label: 'Esfera → Latam Pass', pair: 'esfera:latampass', color: semantic.success },
    { label: 'Livelo → TudoAzul', pair: 'livelo:tudoazul', color: aurora.iris },
    { label: 'Esfera → TudoAzul', pair: 'esfera:tudoazul', color: '#FF6961' },
  ];

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <PressableScale
              onPress={() => router.back()}
              haptic="tap"
              style={styles.iconBtn}
            >
              <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
            </PressableScale>
            <View style={styles.titleBox}>
              <Text style={styles.title}>Notificações</Text>
              <Text style={styles.subtitle}>Push, WhatsApp, filtros</Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {prefs.isLoading ? (
              <View style={{ gap: 12 }}>
                <SkeletonCard />
              </View>
            ) : !p ? (
              <Text style={styles.errorText}>Erro ao carregar preferências</Text>
            ) : (
              <>
                {/* Master toggle */}
                <Animated.View
                  entering={FadeInDown.duration(motion.timing.medium)
                    .springify()
                    .damping(22)}
                >
                  <SettingsGroup header="MASTER">
                    <SettingsRow
                      icon="notifications"
                      iconColor={aurora.cyan}
                      iconBg={aurora.cyanSoft}
                      label="Alertas de bônus"
                      toggle={p.notifyBonus}
                      onToggle={toggleBonus}
                    />
                  </SettingsGroup>
                </Animated.View>

                {/* Filter pairs */}
                {p.notifyBonus && (
                  <Animated.View
                    entering={FadeInDown.delay(80).duration(motion.timing.medium)}
                  >
                    <Text style={styles.sectionLabel}>FILTRO POR PAR</Text>
                    <GlassCard radiusSize="lg" padding={14}>
                      <Text style={styles.note}>
                        Selecione só os pares que você usa. Se deixar vazio, recebe todos.
                      </Text>
                      <View style={styles.pairsWrap}>
                        {SUGGESTED_PAIRS.map((p) => {
                          const selected = selectedPairs.has(p.pair);
                          return (
                            <PressableScale
                              key={p.pair}
                              onPress={() => togglePair(p.pair)}
                              haptic="none"
                            >
                              <View
                                style={[
                                  styles.pairChip,
                                  selected && {
                                    borderColor: p.color,
                                    backgroundColor: `${p.color}1F`,
                                  },
                                ]}
                              >
                                <Ionicons
                                  name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                                  size={14}
                                  color={selected ? p.color : textTokens.muted}
                                />
                                <Text
                                  style={[
                                    styles.pairText,
                                    selected && { color: p.color, fontFamily: 'Inter_700Bold' },
                                  ]}
                                >
                                  {p.label}
                                </Text>
                              </View>
                            </PressableScale>
                          );
                        })}
                      </View>
                    </GlassCard>
                  </Animated.View>
                )}

                {/* WhatsApp */}
                <Animated.View
                  entering={FadeInDown.delay(160).duration(motion.timing.medium)}
                >
                  <SettingsGroup
                    header="WHATSAPP"
                    footer={
                      p.whatsappVerified
                        ? `Verificado${(p as any).whatsappPhoneMasked ? `: ${(p as any).whatsappPhoneMasked}` : ''}`
                        : 'Mais rápido que push. Verificação por SMS.'
                    }
                  >
                    <SettingsRow
                      icon="logo-whatsapp"
                      iconColor={semantic.success}
                      iconBg={semantic.successBg}
                      label="Receber por WhatsApp"
                      toggle={p.notifyWhatsApp && p.whatsappVerified}
                      onToggle={toggleWhatsApp}
                    />
                  </SettingsGroup>
                </Animated.View>

                {/* Verify flow */}
                {verifyStep === 'phone' && (
                  <Animated.View
                    entering={FadeInDown.duration(motion.timing.medium)}
                  >
                    <Text style={styles.sectionLabel}>VERIFICAR WHATSAPP</Text>
                    <GlassCard radiusSize="lg" padding={14}>
                      <Text style={styles.note}>
                        Digite seu WhatsApp com DDD. Vamos mandar um código por SMS.
                      </Text>
                      <FloatingLabelInput
                        label="Telefone (com DDD)"
                        iconLeft="call-outline"
                        value={phone}
                        onChangeText={(v) => setPhone(v.replace(/[^0-9+]/g, ''))}
                        keyboardType="phone-pad"
                        maxLength={15}
                      />
                      <AuroraButton
                        label="Enviar código SMS"
                        onPress={handleStartVerify}
                        loading={startVerify.isPending}
                        disabled={phone.length < 10}
                        variant="primary"
                        size="md"
                        icon="send"
                        fullWidth
                        haptic="medium"
                      />
                      <PressableScale
                        onPress={() => {
                          haptics.tap();
                          setVerifyStep('idle');
                        }}
                        haptic="none"
                        style={styles.cancelBtn}
                      >
                        <Text style={styles.cancelText}>Cancelar</Text>
                      </PressableScale>
                    </GlassCard>
                  </Animated.View>
                )}

                {verifyStep === 'code' && (
                  <Animated.View
                    entering={FadeInDown.duration(motion.timing.medium)}
                  >
                    <Text style={styles.sectionLabel}>CÓDIGO RECEBIDO</Text>
                    <GlassCard radiusSize="lg" padding={14}>
                      <Text style={styles.note}>
                        Digite o código de 6 dígitos que enviamos por SMS.
                      </Text>
                      <FloatingLabelInput
                        label="Código de 6 dígitos"
                        iconLeft="keypad-outline"
                        value={code}
                        onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                      <AuroraButton
                        label="Confirmar"
                        onPress={handleConfirmVerify}
                        loading={confirmVerify.isPending}
                        disabled={code.length < 6}
                        variant="success"
                        size="md"
                        icon="checkmark"
                        fullWidth
                        haptic="success"
                      />
                      <PressableScale
                        onPress={() => {
                          haptics.tap();
                          setVerifyStep('phone');
                        }}
                        haptic="none"
                        style={styles.cancelBtn}
                      >
                        <Text style={styles.cancelText}>Trocar número</Text>
                      </PressableScale>
                    </GlassCard>
                  </Animated.View>
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

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
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: space.md,
  },
  note: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  errorText: {
    color: semantic.danger,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    textAlign: 'center',
    marginTop: space.xl,
  },

  pairsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pairChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    backgroundColor: surface.glass,
  },
  pairText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },

  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 6,
  },
  cancelText: {
    color: aurora.cyan,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
});

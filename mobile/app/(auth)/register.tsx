import React, { useEffect, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAuthStore } from '../../src/store/auth.store';
import { useApplyReferralCode } from '../../src/hooks/useReferral';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
  FloatingLabelInput,
  aurora,
  system,
  semantic,
  surface,
  text as textTokens,
  space,
  motion,
  haptics,
} from '../../src/components/primitives';

export default function RegisterScreen() {
  const { register, isLoading } = useAuthStore();
  const params = useLocalSearchParams<{ ref?: string }>();
  const applyReferral = useApplyReferralCode();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [referralCode, setReferralCode] = useState(
    typeof params.ref === 'string' ? params.ref.toUpperCase() : '',
  );
  const [referralApplied, setReferralApplied] = useState(false);

  useEffect(() => {
    if (typeof params.ref === 'string' && params.ref && !referralCode) {
      setReferralCode(params.ref.toUpperCase());
    }
  }, [params.ref]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!email.trim()) newErrors.email = 'E-mail é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'E-mail inválido';
    if (!password) newErrors.password = 'Senha é obrigatória';
    else if (password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    if (!confirmPassword) newErrors.confirmPassword = 'Confirme a senha';
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Senhas não coincidem';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) haptics.error();
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      haptics.medium();
      await register(name.trim(), email.trim().toLowerCase(), password);
      if (referralCode && referralCode.length >= 6) {
        try {
          await applyReferral.mutateAsync(referralCode.toUpperCase());
          setReferralApplied(true);
        } catch {
          /* silent — user ainda se registrou */
        }
      }
      haptics.success();
    } catch (err: unknown) {
      haptics.error();
      const message =
        err instanceof Error ? err.message : 'Erro ao criar conta. Tente novamente.';
      Alert.alert('Erro', message);
    }
  };

  return (
    <AuroraBackground intensity="hero" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Animated.View
              entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
              style={styles.header}
            >
              <PressableScale
                onPress={() => router.back()}
                haptic="tap"
                style={styles.backBtn}
              >
                <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
              </PressableScale>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Criar conta</Text>
                <Text style={styles.headerSub}>Começe a ganhar com milhas</Text>
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeIn.delay(100).duration(motion.timing.medium)}
            >
              <GlassCard padding={22} radiusSize="xl" glassIntensity="strong">
                <FloatingLabelInput
                  label="Nome completo"
                  iconLeft="person-outline"
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    if (errors.name) setErrors((e) => ({ ...e, name: '' }));
                  }}
                  autoCapitalize="words"
                  autoComplete="name"
                  errorText={errors.name}
                />

                <FloatingLabelInput
                  label="E-mail"
                  iconLeft="mail-outline"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (errors.email) setErrors((e) => ({ ...e, email: '' }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  errorText={errors.email}
                />

                <FloatingLabelInput
                  label="Senha (mínimo 6)"
                  iconLeft="lock-closed-outline"
                  iconRight={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => {
                    haptics.select();
                    setShowPassword(!showPassword);
                  }}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (errors.password) setErrors((e) => ({ ...e, password: '' }));
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  errorText={errors.password}
                />

                <FloatingLabelInput
                  label="Confirmar senha"
                  iconLeft="shield-checkmark-outline"
                  iconRight={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => {
                    haptics.select();
                    setShowConfirmPassword(!showConfirmPassword);
                  }}
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    if (errors.confirmPassword)
                      setErrors((e) => ({ ...e, confirmPassword: '' }));
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  errorText={errors.confirmPassword}
                />

                {/* Referral code field (optional) */}
                <FloatingLabelInput
                  label="Código de convite (opcional)"
                  iconLeft="gift-outline"
                  iconRight={referralApplied ? 'checkmark-circle' : undefined}
                  value={referralCode}
                  onChangeText={(t) => setReferralCode(t.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={16}
                />

                {referralApplied && (
                  <View style={styles.referralOk}>
                    <Ionicons name="checkmark-circle" size={14} color={semantic.success} />
                    <Text style={styles.referralOkText}>
                      Código aplicado — você ganhou benefícios!
                    </Text>
                  </View>
                )}

                <View style={{ height: 4 }} />

                <AuroraButton
                  label="Criar conta"
                  onPress={handleRegister}
                  loading={isLoading}
                  variant="primary"
                  size="lg"
                  icon="arrow-forward"
                  iconPosition="right"
                  fullWidth
                  haptic="medium"
                />

                <View style={styles.terms}>
                  <Ionicons name="shield-checkmark" size={12} color={textTokens.muted} />
                  <Text style={styles.termsText}>
                    Ao criar conta, concorda com os Termos e a Política de Privacidade.
                  </Text>
                </View>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ou</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.loginRow}>
                  <Text style={styles.loginText}>Já tem conta? </Text>
                  <PressableScale
                    onPress={() => {
                      haptics.select();
                      router.push('/(auth)/login');
                    }}
                    haptic="none"
                  >
                    <Text style={styles.loginLink}>Entrar</Text>
                  </PressableScale>
                </View>
              </GlassCard>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.md,
    paddingBottom: space.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: space.lg,
    marginTop: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: surface.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: surface.glassBorder,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: textTokens.primary,
    letterSpacing: -0.4,
  },
  headerSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: textTokens.muted,
    marginTop: 1,
  },

  referralOk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -10,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  referralOkText: {
    color: semantic.success,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },

  terms: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  termsText: {
    flex: 1,
    color: textTokens.muted,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: space.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: surface.separator,
  },
  dividerText: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: textTokens.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  loginLink: {
    color: aurora.cyan,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
});

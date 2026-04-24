import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAuthStore } from '../../src/store/auth.store';
import {
  AuroraBackground,
  AuroraButton,
  FloatingLabelInput,
  GlassCard,
  PressableScale,
  FlyingPlaneScene,
  GradientText,
  SerifItalic,
  aurora,
  text as textTokens,
  space,
  motion,
  haptics,
} from '../../src/components/primitives';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      haptics.error();
      Alert.alert('Atenção', 'Por favor, preencha e-mail e senha.');
      return;
    }
    try {
      haptics.medium();
      await login(email.trim(), password);
      haptics.success();
    } catch {
      haptics.error();
      Alert.alert('Erro ao entrar', 'E-mail ou senha incorretos. Tente novamente.');
    }
  };

  const handleGoogleLogin = () => {
    haptics.tap();
    Alert.alert('Em breve', 'Login com Google estará disponível em breve.');
  };

  return (
    <AuroraBackground intensity="hero" style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Flying plane scene — janela 3D com nuvens em parallax + avião bobbing */}
            <Animated.View
              entering={FadeInDown.duration(motion.timing.medium).springify().damping(20)}
              style={styles.logoContainer}
            >
              <FlyingPlaneScene size={140} intensity="cruising" haloColor={aurora.magenta} />
              <GradientText
                fontSize={34}
                fontWeight="900"
                fontFamily="Inter_900Black"
                letterSpacing={-1}
                style={styles.logoGradientWrap}
              >
                Milhas Extras
              </GradientText>
              <Text style={styles.logoSubtitle}>
                Onde suas milhas{' '}
                <SerifItalic style={styles.logoSubtitleItalic}>valem mais</SerifItalic>.
              </Text>
            </Animated.View>

            {/* Form card */}
            <Animated.View entering={FadeIn.delay(120).duration(motion.timing.medium)}>
              <GlassCard padding={24} radiusSize="xl" glassIntensity="strong">
                <Text style={styles.formTitle}>Bem-vindo de volta</Text>
                <Text style={styles.formSubtitle}>
                  Entre pra acompanhar suas oportunidades.
                </Text>

                <View style={{ height: 24 }} />

                <FloatingLabelInput
                  label="E-mail"
                  iconLeft="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                />

                <FloatingLabelInput
                  label="Senha"
                  iconLeft="lock-closed-outline"
                  iconRight={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => {
                    haptics.select();
                    setShowPassword(!showPassword);
                  }}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                />

                <PressableScale
                  style={styles.forgotRow}
                  haptic="tap"
                  onPress={() =>
                    Alert.alert('Em breve', 'Recuperação de senha estará disponível em breve.')
                  }
                >
                  <Text style={styles.forgotText}>Esqueci minha senha</Text>
                </PressableScale>

                <AuroraButton
                  label="Entrar"
                  onPress={handleLogin}
                  loading={isLoading}
                  variant="gradient"
                  size="lg"
                  icon="arrow-forward"
                  iconPosition="right"
                  fullWidth
                  haptic="medium"
                />

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ou continue com</Text>
                  <View style={styles.dividerLine} />
                </View>

                <PressableScale
                  style={styles.googleButton}
                  onPress={handleGoogleLogin}
                  haptic="tap"
                >
                  <Ionicons name="logo-google" size={20} color={textTokens.primary} />
                  <Text style={styles.googleText}>Google</Text>
                </PressableScale>

                <View style={styles.registerRow}>
                  <Text style={styles.registerText}>Não tem conta? </Text>
                  <PressableScale
                    onPress={() => {
                      haptics.select();
                      router.push('/(auth)/register');
                    }}
                    haptic="none"
                  >
                    <Text style={styles.registerLink}>Criar conta</Text>
                  </PressableScale>
                </View>
              </GlassCard>
            </Animated.View>

            {/* Footer — tagline premium */}
            <Animated.View
              entering={FadeIn.delay(280).duration(motion.timing.medium)}
              style={styles.footer}
            >
              <Text style={styles.footerText}>
                ✨ Feito pra milhas — não só pra voo.
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: space.xl,
    paddingVertical: space.xl,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: space.xxl,
    marginTop: space.lg,
    gap: space.md,
  },
  logoText: {
    fontFamily: 'Inter_900Black',
    fontSize: 30,
    letterSpacing: -0.8,
    color: textTokens.primary,
    marginTop: 4,
  },
  logoGradientWrap: {
    marginTop: 4,
  },
  logoSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: textTokens.muted,
    marginTop: 6,
    textAlign: 'center',
  },
  logoSubtitleItalic: {
    color: textTokens.primary,
    fontSize: 16,
  },
  formTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    letterSpacing: -0.4,
    color: textTokens.primary,
  },
  formSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: textTokens.muted,
    marginTop: 4,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: space.lg,
    padding: 4,
  },
  forgotText: {
    color: aurora.cyan,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: space.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: space.lg,
  },
  googleText: {
    color: textTokens.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: textTokens.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  registerLink: {
    color: aurora.cyan,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    marginTop: space.lg,
  },
  footerText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: textTokens.muted,
    letterSpacing: 0.3,
  },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useAuthStore } from '../../src/store/auth.store';
import {
  AuroraBackground,
  AuroraButton,
  FloatingLabelInput,
  GlassCard,
  PressableScale,
  aurora,
  text as textTokens,
  space,
  motion,
  haptics,
} from '../../src/components/primitives';

const AnimatedPath = Animated.createAnimatedComponent(Path);

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
            {/* Logo com plane + contrail SVG */}
            <Animated.View
              entering={FadeInDown.duration(motion.timing.medium).springify().damping(20)}
              style={styles.logoContainer}
            >
              <LogoWithContrail />
              <Text style={styles.logoText}>Milhas Extras</Text>
              <Text style={styles.logoSubtitle}>Onde suas milhas viram mais</Text>
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
                  variant="primary"
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

// ─── Logo com avião e contrail ──────────────────────────────────────────

function LogoWithContrail() {
  const trail = useSharedValue(0);

  useEffect(() => {
    trail.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.bezier(0.2, 0, 0.8, 1) }),
        withTiming(0, { duration: 400, easing: Easing.linear }),
      ),
      -1,
      false,
    );
  }, [trail]);

  const pathStyle = useAnimatedStyle(() => ({
    opacity: trail.value < 0.9 ? trail.value * 1.2 : (1 - trail.value) * 10,
  }));

  return (
    <View style={styles.logoIconWrap}>
      <LinearGradient
        colors={['rgba(34, 211, 238, 0.22)', 'rgba(232, 121, 249, 0.22)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.logoHalo}
      />
      <LinearGradient
        colors={[aurora.cyan, aurora.iris, aurora.magenta]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.logoIcon}
      >
        {/* Contrail SVG — risco luminoso atrás do avião */}
        <Svg
          width={80}
          height={80}
          viewBox="0 0 80 80"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <SvgLinearGradient id="trail" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#fff" stopOpacity="0" />
              <Stop offset="1" stopColor="#fff" stopOpacity="0.85" />
            </SvgLinearGradient>
          </Defs>
          <AnimatedPath
            d="M 8 56 Q 32 38, 62 22"
            stroke="url(#trail)"
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="4 6"
            animatedProps={pathStyle as any}
          />
        </Svg>
        <Ionicons name="airplane" size={34} color="#fff" />
      </LinearGradient>
    </View>
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
  },
  logoIconWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  logoHalo: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 999,
    opacity: 0.6,
    transform: [{ scale: 1.05 }],
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: aurora.magenta,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
  },
  logoText: {
    fontFamily: 'Inter_900Black',
    fontSize: 30,
    letterSpacing: -0.8,
    color: textTokens.primary,
    marginTop: 4,
  },
  logoSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: textTokens.muted,
    marginTop: 4,
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

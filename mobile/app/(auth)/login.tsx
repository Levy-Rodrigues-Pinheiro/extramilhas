/**
 * Login — Aurora UI editorial hero.
 *
 * Conceitos aplicados:
 *
 *  1. TIPOGRAFIA EDITORIAL CINEMATOGRÁFICA
 *     - Hero display 56-64px com quebra de linha dramática
 *     - Palavra-chave em SerifItalic (Georgia-Italic) — padrão Aurora UI
 *     - Overline small-caps spaced como teaser
 *
 *  2. MESH BG + NOISE — intensity="hero" (2 orbs vibrantes + grão)
 *
 *  3. AVIÃO COMO ORNAMENTO, NÃO CENTRO
 *     - FlyingPlaneScene pequeno (80px) no canto superior direito
 *     - Não compete com o hero tipográfico
 *
 *  4. INPUTS MINIMALISTAS (UnderlineInput)
 *     - Underline cyan com glow ao focar (estilo Apple HIG)
 *     - Zero glass box — respira
 *     - Shake horizontal on error + haptic
 *
 *  5. CTA PILL GRADIENT
 *     - AuroraButton variant='gradient' (blue → purple + glow)
 *     - Pill radius 100 — Aurora UI signature
 *
 *  6. SOCIAL LOGIN COMO GHOST PILLS INLINE
 *     - 2 botões ghost pill lado a lado (Apple + Google)
 *     - Não domina o form
 *
 *  7. STAGGER ENTRANCE CASCADE
 *     - Cada elemento entra 80-120ms após o anterior
 *     - FadeInDown.springify — bounce suave Aurora UI
 *
 *  8. HAPTIC RICH
 *     - focus: select (tic)
 *     - submit: medium (base)
 *     - success: success (double tic)
 *     - error: shake + error haptic
 *
 *  9. FOOTER EDITORIAL
 *     - "Primeira vez? Criar conta" — entry point óbvio
 *     - Tagline com SerifItalic — "Milhas, não só voos."
 *
 * 10. LAYOUT RESPIRANTE
 *     - Muito espaço negativo (pattern Aurora UI)
 *     - Hero ocupa 40% da tela, form desce naturalmente
 */

import React, { useRef, useState } from 'react';
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
import Animated, {
  FadeInDown,
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useAuthStore } from '../../src/store/auth.store';
import {
  AuroraBackground,
  AuroraButton,
  UnderlineInput,
  type UnderlineInputHandle,
  PressableScale,
  PaperPlaneOrbit,
  SerifItalic,
  GradientText,
  aurora,
  system,
  surface,
  text as textTokens,
  space,
  motion,
  haptics,
} from '../../src/components/primitives';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const { login, isLoading } = useAuthStore();

  const emailRef = useRef<UnderlineInputHandle>(null);
  const passwordRef = useRef<UnderlineInputHandle>(null);

  // Breathing glow no CTA (aurora do botão pulsa lentamente)
  const ctaGlow = useSharedValue(0);
  React.useEffect(() => {
    ctaGlow.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [ctaGlow]);
  const ctaBreathStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ctaGlow.value, [0, 1], [0.35, 0.65]),
    transform: [{ scale: interpolate(ctaGlow.value, [0, 1], [1.0, 1.04]) }],
  }));

  const validate = () => {
    let valid = true;
    setEmailError(undefined);
    setPasswordError(undefined);

    if (!email.trim()) {
      setEmailError('Informe seu e-mail');
      emailRef.current?.shake();
      valid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailError('E-mail inválido');
      emailRef.current?.shake();
      valid = false;
    }
    if (!password) {
      setPasswordError('Informe sua senha');
      if (valid) passwordRef.current?.shake(); // só uma shake ao mesmo tempo
      valid = false;
    }
    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      haptics.medium();
      await login(email.trim(), password);
      haptics.success();
    } catch {
      emailRef.current?.shake();
      passwordRef.current?.shake();
      setPasswordError('Credenciais incorretas. Tente de novo.');
    }
  };

  const soonAlert = (what: string) => () => {
    haptics.tap();
    Alert.alert('Em breve', `${what} estará disponível em breve.`);
  };

  return (
    <AuroraBackground intensity="hero" style={{ flex: 1 }}>
      {/* ─── Avião de papel branco orbitando em figura-8 (fullscreen) ─── */}
      <PaperPlaneOrbit
        planeSize={44}
        duration={24000}
        pathAmplitudeX={0.36}
        pathAmplitudeY={0.28}
        showTrail
        trailCount={12}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ─── Overline (small-caps teaser) ─── */}
            <Animated.View entering={FadeIn.duration(motion.timing.medium)}>
              <Text style={styles.overline}>MILHAS EXTRAS · v1.0</Text>
            </Animated.View>

            {/* ─── Hero editorial tipográfico ─── */}
            <View style={styles.heroBlock}>
              <Animated.View
                entering={FadeInDown.delay(80).duration(motion.timing.long).springify().damping(22)}
              >
                <Text style={styles.heroLine1}>De</Text>
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(180).duration(motion.timing.long).springify().damping(22)}
                style={styles.heroLine2Row}
              >
                <Text style={styles.heroLine1}>volta ao </Text>
                <SerifItalic style={styles.heroItalic}>cofre</SerifItalic>
                <Text style={styles.heroLine1}>.</Text>
              </Animated.View>

              <Animated.View
                entering={FadeIn.delay(340).duration(motion.timing.medium)}
                style={styles.heroSubRow}
              >
                <Text style={styles.heroSub}>
                  Onde suas milhas dormem e{' '}
                  <SerifItalic style={styles.heroSubItalic}>acordam maiores</SerifItalic>.
                </Text>
              </Animated.View>
            </View>

            {/* ─── Form (inputs underline) ─── */}
            <Animated.View
              entering={FadeInUp.delay(440).duration(motion.timing.medium)}
              style={styles.form}
            >
              <UnderlineInput
                ref={emailRef}
                label="E-mail"
                icon="mail-outline"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (emailError) setEmailError(undefined);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                errorText={emailError}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <UnderlineInput
                ref={passwordRef}
                label="Senha"
                icon="lock-closed-outline"
                iconRight={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => {
                  haptics.select();
                  setShowPassword(!showPassword);
                }}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (passwordError) setPasswordError(undefined);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                errorText={passwordError}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />

              <PressableScale
                style={styles.forgotRow}
                haptic="tap"
                onPress={soonAlert('Recuperação de senha')}
              >
                <Text style={styles.forgotText}>Esqueci minha senha</Text>
              </PressableScale>

              {/* ─── CTA principal com breath glow ambiente ─── */}
              <View style={styles.ctaWrap}>
                <Animated.View style={[styles.ctaBreath, ctaBreathStyle]} />
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
              </View>
            </Animated.View>

            {/* ─── Divider hairline + "ou" ─── */}
            <Animated.View
              entering={FadeIn.delay(600).duration(motion.timing.medium)}
              style={styles.divider}
            >
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OU</Text>
              <View style={styles.dividerLine} />
            </Animated.View>

            {/* ─── Social login (ghost pills inline) ─── */}
            <Animated.View
              entering={FadeIn.delay(680).duration(motion.timing.medium)}
              style={styles.socialRow}
            >
              <PressableScale
                style={styles.socialBtn}
                haptic="tap"
                onPress={soonAlert('Login com Apple')}
              >
                <Ionicons name="logo-apple" size={22} color={textTokens.primary} />
                <Text style={styles.socialText}>Apple</Text>
              </PressableScale>

              <PressableScale
                style={styles.socialBtn}
                haptic="tap"
                onPress={soonAlert('Login com Google')}
              >
                <Ionicons name="logo-google" size={20} color={textTokens.primary} />
                <Text style={styles.socialText}>Google</Text>
              </PressableScale>
            </Animated.View>

            {/* ─── Footer: "primeira vez" + tagline editorial ─── */}
            <Animated.View
              entering={FadeIn.delay(780).duration(motion.timing.medium)}
              style={styles.footer}
            >
              <View style={styles.registerRow}>
                <Text style={styles.registerText}>Primeira vez? </Text>
                <PressableScale
                  onPress={() => {
                    haptics.select();
                    router.push('/(auth)/register');
                  }}
                  haptic="none"
                >
                  <GradientText
                    fontSize={14}
                    fontWeight="700"
                    fontFamily="Inter_700Bold"
                  >
                    Criar conta
                  </GradientText>
                </PressableScale>
              </View>

              <Text style={styles.tagline}>
                Milhas, não só{' '}
                <SerifItalic style={styles.taglineItalic}>voos</SerifItalic>.
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.xxl,
  },

  // Overline
  overline: {
    color: textTokens.tertiary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    marginBottom: space.xl,
  },

  // Hero editorial
  heroBlock: {
    marginBottom: space.xxl,
  },
  heroLine1: {
    color: textTokens.primary,
    fontFamily: 'Inter_900Black',
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -2.2,
  },
  heroLine2Row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  heroItalic: {
    fontSize: 56,
    color: textTokens.primary,
    letterSpacing: -2.2,
    lineHeight: 60,
    fontWeight: '400',
  },
  heroSubRow: {
    marginTop: 18,
    maxWidth: '90%',
  },
  heroSub: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  heroSubItalic: {
    fontSize: 17,
    color: textTokens.primary,
  },

  // Form
  form: {
    marginBottom: space.lg,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: space.lg,
    padding: 6,
  },
  forgotText: {
    color: aurora.cyan,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    letterSpacing: -0.1,
  },

  // CTA wrapper (breath glow atrás)
  ctaWrap: {
    position: 'relative',
  },
  ctaBreath: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 100,
    backgroundColor: aurora.cyan,
    shadowColor: aurora.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 32,
    elevation: 0,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: space.xl,
    marginBottom: space.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: surface.glassBorder,
  },
  dividerText: {
    color: textTokens.tertiary,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 2,
  },

  // Social row
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: space.xxl,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: surface.glassBorderActive,
    backgroundColor: surface.glass,
  },
  socialText: {
    color: textTokens.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    letterSpacing: -0.1,
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: space.md,
    marginTop: 'auto',
    paddingTop: space.lg,
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  tagline: {
    color: textTokens.tertiary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  taglineItalic: {
    color: textTokens.secondary,
    fontSize: 14,
  },
});

/**
 * Login — Port fiel do login-page.tsx Aurora UI (web) para React Native.
 *
 * Arquitetura visual (mesma hierarquia do template):
 *
 *  ┌──────────────────────────────────────────┐
 *  │ [ Milhas Extras ]              (atmos.)  │ ← logo canto superior
 *  │                                           │
 *  │            ┌─────────────────┐            │
 *  │            │    ┌────┐       │            │
 *  │            │    │ 🔒 │ gradient sq       │
 *  │            │    └────┘                    │
 *  │            │  Bem-vindo de *volta*        │ ← heading com serif italic
 *  │            │  Entre para continuar...     │
 *  │            │                              │
 *  │            │  [ 🍎 Continuar com Apple ]  │ ← social primary (white bg)
 *  │            │  [ G  Continuar com Google ] │ ← social ghost (glass)
 *  │            │                              │
 *  │            │  ─────── ou com email ─────  │
 *  │            │                              │
 *  │            │  Email                       │
 *  │            │  [ ✉ ________________ ]      │
 *  │            │  Senha                       │
 *  │            │  [ 🔒 _________ 👁 ]         │
 *  │            │  [ ] Lembrar       Esqueceu? │
 *  │            │                              │
 *  │            │  [   Entrar →   ] gradient  │
 *  │            │                              │
 *  │            │  Ainda não tem conta? Criar  │
 *  │            └─────────────────┘            │
 *  │                                           │
 *  │   Ao continuar, Termos + Privacidade...  │ ← footer minúsculo
 *  └──────────────────────────────────────────┘
 *
 * Conceitos Aurora UI aplicados (mapeamento web → RN):
 *  - motion.div initial/animate → Animated.View entering FadeIn/FadeInDown
 *  - Reveal direction="scale" → FadeIn scale entrance
 *  - MagneticButton → PressableScale pressedScale 0.96 (approx)
 *  - AnimatePresence signin/signup swap → não usado (rotas separadas)
 *  - mesh-bg + noise → AuroraBackground intensity="hero"
 *  - PaperPlaneOrbit como atmospheric layer (fundo)
 *  - gradient-text + serif-italic → GradientText italic fontFamily=Georgia
 *  - GlassCard padding 48/40 → GlassCard radiusSize="xl" padding={32}
 *  - Lock icon quadrado gradient → LinearGradient 64x64 radius 18 com lock SVG
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
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeIn,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/auth.store';
import {
  AuroraBackground,
  AuroraButton,
  AuroraInput,
  GlassCard,
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
  const [remember, setRemember] = useState(true);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const { login, isLoading } = useAuthStore();

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Breath glow no lock icon — respira lentamente
  const iconBreath = useSharedValue(0);
  React.useEffect(() => {
    iconBreath.value = withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [iconBreath]);
  const iconGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(iconBreath.value, [0, 1], [0.35, 0.7]),
  }));

  const validate = () => {
    let valid = true;
    setEmailError(undefined);
    setPasswordError(undefined);
    if (!email.trim()) {
      setEmailError('Informe seu e-mail');
      valid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailError('E-mail inválido');
      valid = false;
    }
    if (!password) {
      setPasswordError('Informe sua senha');
      valid = false;
    }
    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) {
      haptics.error();
      return;
    }
    try {
      haptics.medium();
      await login(email.trim(), password);
      haptics.success();
    } catch {
      haptics.error();
      setPasswordError('Credenciais incorretas. Tente novamente.');
    }
  };

  const soonAlert = (what: string) => () => {
    haptics.tap();
    Alert.alert('Em breve', `${what} estará disponível em breve.`);
  };

  return (
    <AuroraBackground intensity="hero" style={{ flex: 1 }}>
      {/* Atmosfera: avião de papel orbitando em fundo */}
      <PaperPlaneOrbit
        planeSize={52}
        duration={28000}
        pathAmplitudeX={0.40}
        pathAmplitudeY={0.30}
        showTrail
        trailCount={14}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Logo/marca no canto superior esquerdo (Aurora UI web: position:fixed top:28 left:32) */}
        <Animated.View
          entering={FadeInDown.duration(800).easing(Easing.bezier(0.16, 1, 0.3, 1) as any)}
          style={styles.logoCorner}
        >
          <GradientText
            fontSize={20}
            fontWeight="700"
            letterSpacing={-0.6}
            fontFamily="Inter_700Bold"
            colors={[textTokens.primary, aurora.cyan]}
          >
            Milhas Extras
          </GradientText>
        </Animated.View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Card central — GlassCard (web Aurora UI padding 48/40) */}
            <Animated.View
              entering={ZoomIn.duration(1000).easing(Easing.bezier(0.16, 1, 0.3, 1) as any)}
              style={styles.cardWrap}
            >
              <GlassCard
                radiusSize="xl"
                padding={32}
                glassIntensity="strong"
                elevated
              >
                {/* ─── Cabeçalho: lock icon + heading + subtitle ─── */}
                <View style={styles.header}>
                  {/* Lock icon quadrado gradient 64x64 (spring entrance scale+rotate) */}
                  <Animated.View
                    entering={ZoomIn.delay(300).duration(700).springify().damping(14)}
                    style={styles.lockWrap}
                  >
                    <Animated.View style={[styles.lockGlow, iconGlowStyle]} />
                    <LinearGradient
                      colors={[aurora.cyan, aurora.iris]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.lockSquare}
                    >
                      <Ionicons name="lock-closed" size={28} color="#fff" />
                    </LinearGradient>
                  </Animated.View>

                  {/* Heading: "Bem-vindo de *volta*" */}
                  <Animated.View
                    entering={FadeIn.delay(500).duration(motion.timing.medium)}
                  >
                    <View style={styles.headingRow}>
                      <Text style={styles.heading}>Bem-vindo de </Text>
                      <GradientText
                        italic
                        fontSize={28}
                        fontWeight="400"
                        letterSpacing={-0.85}
                        fontFamily={Platform.select({
                          ios: 'Georgia-Italic',
                          android: 'serif',
                          default: 'Georgia',
                        })}
                      >
                        volta
                      </GradientText>
                    </View>
                    <Text style={styles.subtitle}>
                      Entre para continuar onde parou
                    </Text>
                  </Animated.View>
                </View>

                {/* ─── Social buttons ─── */}
                <Animated.View
                  entering={FadeIn.delay(620).duration(motion.timing.medium)}
                  style={styles.socialGroup}
                >
                  <SocialButton
                    icon={<Ionicons name="logo-apple" size={20} color="#000" />}
                    label="Continuar com Apple"
                    primary
                    onPress={soonAlert('Login com Apple')}
                  />
                  <SocialButton
                    icon={<Ionicons name="logo-google" size={18} color={textTokens.primary} />}
                    label="Continuar com Google"
                    onPress={soonAlert('Login com Google')}
                  />
                </Animated.View>

                {/* ─── Divisor "ou com email" ─── */}
                <Animated.View
                  entering={FadeIn.delay(720).duration(motion.timing.medium)}
                  style={styles.divider}
                >
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ou com email</Text>
                  <View style={styles.dividerLine} />
                </Animated.View>

                {/* ─── Formulário ─── */}
                <Animated.View
                  entering={FadeIn.delay(780).duration(motion.timing.medium)}
                  style={{ gap: 14 }}
                >
                  <AuroraInput
                    ref={emailRef}
                    label="Email"
                    icon="mail-outline"
                    placeholder="voce@exemplo.com"
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

                  <AuroraInput
                    ref={passwordRef}
                    label="Senha"
                    icon="lock-closed-outline"
                    placeholder="••••••••"
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
                    suffix={
                      <Pressable
                        onPress={() => {
                          haptics.select();
                          setShowPassword((s) => !s);
                        }}
                        hitSlop={10}
                        style={styles.eyeBtn}
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color={textTokens.tertiary}
                        />
                      </Pressable>
                    }
                  />

                  {/* Lembrar + Esqueceu */}
                  <View style={styles.rememberRow}>
                    <PressableScale
                      onPress={() => {
                        haptics.select();
                        setRemember(!remember);
                      }}
                      haptic="none"
                      style={styles.checkRow}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          remember && styles.checkboxActive,
                        ]}
                      >
                        {remember && (
                          <Ionicons name="checkmark" size={12} color="#000" />
                        )}
                      </View>
                      <Text style={styles.rememberText}>Lembrar de mim</Text>
                    </PressableScale>

                    <PressableScale
                      haptic="tap"
                      onPress={soonAlert('Recuperação de senha')}
                    >
                      <Text style={styles.forgotText}>Esqueceu a senha?</Text>
                    </PressableScale>
                  </View>

                  {/* CTA Entrar (MagneticButton web → PressableScale forte) */}
                  <View style={{ marginTop: 8 }}>
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

                {/* ─── Toggle signin/signup ─── */}
                <Animated.View
                  entering={FadeIn.delay(900).duration(motion.timing.medium)}
                  style={styles.toggleRow}
                >
                  <Text style={styles.toggleText}>Ainda não tem conta? </Text>
                  <PressableScale
                    onPress={() => {
                      haptics.select();
                      router.push('/(auth)/register');
                    }}
                    haptic="none"
                  >
                    <Text style={styles.toggleLink}>Criar conta</Text>
                  </PressableScale>
                </Animated.View>
              </GlassCard>
            </Animated.View>

            {/* ─── Rodapé: Termos + Política ─── */}
            <Animated.View
              entering={FadeIn.delay(1100).duration(motion.timing.medium)}
              style={styles.footer}
            >
              <Text style={styles.footerText}>
                Ao continuar, você concorda com os{' '}
                <Text
                  style={styles.footerLink}
                  onPress={soonAlert('Termos de uso')}
                >
                  Termos
                </Text>
                {' '}e a{' '}
                <Text
                  style={styles.footerLink}
                  onPress={soonAlert('Política de privacidade')}
                >
                  Política de privacidade
                </Text>
                .
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── SocialButton (Apple/Google) ───────────────────────────────────────

function SocialButton({
  icon,
  label,
  primary = false,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  onPress?: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="tap"
      pressedScale={0.97}
      style={[
        styles.socialBtn,
        primary ? styles.socialBtnPrimary : styles.socialBtnGhost,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.socialLabel,
          { color: primary ? '#000' : textTokens.primary },
        ]}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Logo no canto
  logoCorner: {
    paddingHorizontal: space.md,
    paddingVertical: 8,
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.xl,
    justifyContent: 'center',
  },

  // Card central
  cardWrap: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },

  // Header (lock icon + heading + subtitle)
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  lockWrap: {
    width: 64,
    height: 64,
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockGlow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 18,
    shadowColor: aurora.cyan,
    shadowOffset: { width: 0, height: 15 },
    shadowRadius: 28,
    shadowOpacity: 0.55,
    elevation: 12,
    backgroundColor: aurora.cyan,
    opacity: 0.001, // shadow sem tinta visível
  },
  lockSquare: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heading: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: textTokens.primary,
    letterSpacing: -0.85,
    lineHeight: 32,
  },
  subtitle: {
    marginTop: 8,
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: -0.05,
  },

  // Social buttons
  socialGroup: {
    gap: 10,
    marginBottom: 4,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  socialBtnPrimary: {
    backgroundColor: '#ffffff',
  },
  socialBtnGhost: {
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderColor: surface.glassBorderActive,
  },
  socialLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    letterSpacing: -0.1,
  },

  // Divisor "ou com email"
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: surface.glassBorder,
  },
  dividerText: {
    color: textTokens.tertiary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    letterSpacing: 0.1,
  },

  // Eye button dentro do input suffix
  eyeBtn: {
    padding: 4,
  },

  // Lembrar + Esqueceu
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: surface.glassBorderActive,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: surface.glass,
  },
  checkboxActive: {
    backgroundColor: aurora.cyan,
    borderColor: aurora.cyan,
  },
  rememberText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    letterSpacing: -0.05,
  },
  forgotText: {
    color: aurora.cyan,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    letterSpacing: -0.05,
  },

  // Toggle signin/signup
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  toggleText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  toggleLink: {
    color: aurora.cyan,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    letterSpacing: -0.05,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 16,
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: space.md,
  },
  footerText: {
    color: textTokens.tertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  footerLink: {
    color: textTokens.secondary,
    textDecorationLine: 'underline',
  },
});

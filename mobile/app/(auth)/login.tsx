/**
 * Login — Port do login-page-advanced.tsx Aurora UI para React Native.
 *
 * Fluxo (state machine Step):
 *
 *   biometric ─→ success            (scan Face ID ok)
 *      │
 *      └─→ methods ─→ credentials ─→ twofa ─→ success
 *                 ├─→ magic-sent (mock)
 *                 └─→ (passkey) ─→ success
 *
 * Componentes-steps inline (mesma hierarquia do template web):
 *  - BiometricStep: scanner 180px com frame SVG gradient + pulse idle +
 *    scan line animada + checkmark final
 *  - MethodsStep: lista de MethodButtons (Passkey badge/Apple/Google/Email/Magic)
 *  - CredentialsStep: email + senha + submit → 2FA
 *  - TwoFactorStep: OTPInput 6 dígitos com auto-submit, shake on error, resend
 *  - MagicSentStep: confirmação com ícone sparkle
 *  - SuccessStep: checkmark verde + redirect automático
 *
 * PaperPlaneOrbit continua como atmosfera no fundo.
 * AnimatePresence → keys + entering/exiting (Reanimated transitions).
 */

import React, { useEffect, useRef, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
  ZoomIn,
  SlideInRight,
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { useAuthStore } from '../../src/store/auth.store';
import {
  AuroraBackground,
  AuroraButton,
  AuroraInput,
  OTPInput,
  type OTPInputHandle,
  GlassCard,
  PressableScale,
  PaperPlaneOrbit,
  GradientText,
  aurora,
  system,
  surface,
  text as textTokens,
  semantic,
  space,
  motion,
  haptics,
} from '../../src/components/primitives';

type Step =
  | 'biometric'
  | 'methods'
  | 'credentials'
  | 'twofa'
  | 'magic-sent'
  | 'success';

const SERIF_ITALIC_FAMILY = Platform.select({
  ios: 'Georgia-Italic',
  android: 'serif',
  default: 'Georgia',
}) as string;

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('biometric');
  const [magicEmail, setMagicEmail] = useState('');

  // Success redirect — volta pra home após 1.5s
  useEffect(() => {
    if (step === 'success') {
      const t = setTimeout(() => {
        router.replace('/(tabs)' as any);
      }, 1600);
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <AuroraBackground intensity="hero" style={{ flex: 1 }}>
      <PaperPlaneOrbit
        planeSize={48}
        duration={28000}
        pathAmplitudeX={0.40}
        pathAmplitudeY={0.28}
        showTrail
        trailCount={14}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Logo canto superior */}
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
            <Animated.View
              entering={ZoomIn.duration(1000).easing(Easing.bezier(0.16, 1, 0.3, 1) as any)}
              style={styles.cardWrap}
            >
              <GlassCard
                radiusSize="xl"
                padding={32}
                glassIntensity="strong"
                elevated
                style={styles.card}
              >
                {/* AnimatePresence → conditional render com keys + entering/exiting */}
                {step === 'biometric' && (
                  <BiometricStep
                    key="biometric"
                    onScan={() => setStep('success')}
                    onUseAnotherMethod={() => setStep('methods')}
                  />
                )}
                {step === 'methods' && (
                  <MethodsStep
                    key="methods"
                    onPickCredentials={() => setStep('credentials')}
                    onPickMagicLink={(e) => {
                      setMagicEmail(e);
                      setStep('magic-sent');
                    }}
                    onPickPasskey={() => setStep('success')}
                    onBack={() => setStep('biometric')}
                  />
                )}
                {step === 'credentials' && (
                  <CredentialsStep
                    key="credentials"
                    onSubmit={() => setStep('twofa')}
                    onBack={() => setStep('methods')}
                  />
                )}
                {step === 'twofa' && (
                  <TwoFactorStep
                    key="twofa"
                    onVerify={() => setStep('success')}
                    onBack={() => setStep('credentials')}
                  />
                )}
                {step === 'magic-sent' && (
                  <MagicSentStep
                    key="magic-sent"
                    email={magicEmail}
                    onBack={() => setStep('methods')}
                  />
                )}
                {step === 'success' && <SuccessStep key="success" />}
              </GlassCard>
            </Animated.View>

            {/* Footer */}
            <Animated.View
              entering={FadeIn.delay(600).duration(motion.timing.medium)}
              style={styles.footer}
            >
              <Text style={styles.footerText}>
                Protegido por criptografia de ponta a ponta
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ══════════════════════════════════════════════════════════════════════
// STEP 0 — BIOMETRIC (Face ID scanner 180x180)
// ══════════════════════════════════════════════════════════════════════

function BiometricStep({
  onScan,
  onUseAnotherMethod,
}: {
  onScan: () => void;
  onUseAnotherMethod: () => void;
}) {
  const [scanning, setScanning] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleScan = async () => {
    haptics.select();
    setScanning(true);
    await new Promise((r) => setTimeout(r, 2000));
    setSuccess(true);
    haptics.success();
    await new Promise((r) => setTimeout(r, 600));
    onScan();
  };

  const statusText = success
    ? 'Reconhecido'
    : scanning
      ? 'Olhe para a câmera...'
      : 'Use Face ID para continuar';

  return (
    <Animated.View
      key="biometric"
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(300)}
      style={styles.stepCenter}
    >
      <View style={styles.headerCenter}>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>Olá, </Text>
          <GradientText
            italic
            fontSize={28}
            fontWeight="400"
            letterSpacing={-0.85}
            fontFamily={SERIF_ITALIC_FAMILY}
          >
            novamente
          </GradientText>
        </View>
        <Text style={styles.subtitle}>{statusText}</Text>
      </View>

      <FaceIDScanner
        scanning={scanning}
        success={success}
        onClick={handleScan}
      />

      <Pressable
        onPress={onUseAnotherMethod}
        disabled={scanning}
        style={{ padding: 10, opacity: scanning ? 0.4 : 1 }}
      >
        <Text style={styles.cyanLink}>Entrar de outra forma</Text>
      </Pressable>
    </Animated.View>
  );
}

function FaceIDScanner({
  scanning,
  success,
  onClick,
}: {
  scanning: boolean;
  success: boolean;
  onClick: () => void;
}) {
  const size = 180;
  const scanTop = useSharedValue(24);

  useEffect(() => {
    if (scanning && !success) {
      scanTop.value = withRepeat(
        withSequence(
          withTiming(size - 24, {
            duration: 800,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(24, {
            duration: 800,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
        -1,
        false,
      );
    } else {
      scanTop.value = 24;
    }
  }, [scanning, success, scanTop]);

  const scanLineStyle = useAnimatedStyle(() => ({
    top: scanTop.value,
  }));

  return (
    <Pressable
      onPress={onClick}
      disabled={scanning}
      style={{
        width: size,
        height: size,
        position: 'relative',
      }}
    >
      {/* Frame SVG (4 cantos arredondados com gradient) */}
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <SvgLinearGradient id="faceidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={aurora.cyan} />
            <Stop offset="100%" stopColor={aurora.iris} />
          </SvgLinearGradient>
        </Defs>
        {/* 4 cantos quarto-círculo arredondados — cantos top-left, top-right, bottom-right, bottom-left */}
        <Path
          d={`M 8 40 Q 8 8 40 8`}
          stroke="url(#faceidGrad)"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={`M ${size - 40} 8 Q ${size - 8} 8 ${size - 8} 40`}
          stroke="url(#faceidGrad)"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={`M ${size - 8} ${size - 40} Q ${size - 8} ${size - 8} ${size - 40} ${size - 8}`}
          stroke="url(#faceidGrad)"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={`M 40 ${size - 8} Q 8 ${size - 8} 8 ${size - 40}`}
          stroke="url(#faceidGrad)"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>

      {/* Pulso radial idle (3 ondas defasadas) */}
      {!scanning && !success && (
        <>
          <PulseRing delay={0} />
          <PulseRing delay={600} />
          <PulseRing delay={1200} />
        </>
      )}

      {/* Scan line horizontal */}
      {scanning && !success && (
        <Animated.View style={[styles.scanLine, scanLineStyle]}>
          <LinearGradient
            colors={[
              'transparent',
              aurora.cyan,
              aurora.iris,
              'transparent',
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1, borderRadius: 2 }}
          />
        </Animated.View>
      )}

      {/* Centro: face icon ou checkmark */}
      <View style={styles.scannerCenter}>
        {success ? (
          <Animated.View
            entering={ZoomIn.springify().damping(12)}
          >
            <Ionicons
              name="checkmark"
              size={60}
              color={semantic.success}
            />
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeIn}
            style={{ opacity: scanning ? 1 : 0.85 }}
          >
            <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
              <Path
                stroke={textTokens.primary}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7V5a2 2 0 0 1 2-2h2"
              />
              <Path
                stroke={textTokens.primary}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 3h2a2 2 0 0 1 2 2v2"
              />
              <Path
                stroke={textTokens.primary}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 17v2a2 2 0 0 1-2 2h-2"
              />
              <Path
                stroke={textTokens.primary}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 21H5a2 2 0 0 1-2-2v-2"
              />
              <Path
                stroke={textTokens.primary}
                strokeWidth={1.5}
                strokeLinecap="round"
                d="M9 9 L 9 11"
              />
              <Path
                stroke={textTokens.primary}
                strokeWidth={1.5}
                strokeLinecap="round"
                d="M15 9 L 15 11"
              />
              <Path
                stroke={textTokens.primary}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 16s1 1.5 3 1.5 3-1.5 3-1.5"
              />
              <Path
                stroke={textTokens.primary}
                strokeWidth={1.5}
                strokeLinecap="round"
                d="M12 9 L 12 13"
              />
            </Svg>
          </Animated.View>
        )}
      </View>
    </Pressable>
  );
}

function PulseRing({ delay }: { delay: number }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      ),
    );
  }, [p, delay]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(p.value, [0, 1], [1, 1.4]) },
    ],
    opacity: interpolate(p.value, [0, 1], [0.6, 0], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.pulseRing, style]}
    />
  );
}

// ══════════════════════════════════════════════════════════════════════
// STEP 1 — METHODS (Method picker)
// ══════════════════════════════════════════════════════════════════════

function MethodsStep({
  onPickCredentials,
  onPickMagicLink,
  onPickPasskey,
  onBack,
}: {
  onPickCredentials: () => void;
  onPickMagicLink: (email: string) => void;
  onPickPasskey: () => void;
  onBack: () => void;
}) {
  const [showMagicInput, setShowMagicInput] = useState(false);
  const [magicEmail, setMagicEmail] = useState('');

  return (
    <Animated.View
      key="methods"
      entering={SlideInRight.duration(400)}
      exiting={SlideOutLeft.duration(300)}
      style={{ flex: 1 }}
    >
      <BackButton onPress={onBack} />

      <View style={styles.headerCenter}>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>Escolha como </Text>
          <GradientText
            italic
            fontSize={28}
            fontWeight="400"
            letterSpacing={-0.85}
            fontFamily={SERIF_ITALIC_FAMILY}
          >
            entrar
          </GradientText>
        </View>
        <Text style={styles.subtitle}>Vários caminhos, uma identidade</Text>
      </View>

      <View style={{ gap: 10 }}>
        <MethodButton
          icon="key"
          label="Entrar com Passkey"
          desc="Mais rápido e seguro"
          badge="Recomendado"
          onPress={onPickPasskey}
        />
        <MethodButton
          icon="logo-apple"
          iconColor={textTokens.primary}
          label="Continuar com Apple"
          onPress={() =>
            Alert.alert('Em breve', 'Login com Apple estará disponível em breve.')
          }
        />
        <MethodButton
          icon="logo-google"
          iconColor={textTokens.primary}
          label="Continuar com Google"
          onPress={() =>
            Alert.alert('Em breve', 'Login com Google estará disponível em breve.')
          }
        />

        <View style={styles.methodDivider} />

        <MethodButton
          icon="mail-outline"
          label="Email + senha"
          onPress={onPickCredentials}
        />

        {!showMagicInput ? (
          <MethodButton
            icon="sparkles"
            label="Magic link por email"
            desc="Sem senha, só clica no link"
            onPress={() => {
              haptics.tap();
              setShowMagicInput(true);
            }}
          />
        ) : (
          <Animated.View
            entering={FadeIn.duration(240)}
            style={styles.magicInputBox}
          >
            <TextInput
              autoFocus
              placeholder="seu@email.com"
              placeholderTextColor={textTokens.tertiary}
              value={magicEmail}
              onChangeText={setMagicEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              style={styles.magicInput}
              selectionColor={aurora.cyan}
            />
            <PressableScale
              disabled={!magicEmail}
              onPress={() => {
                if (magicEmail) {
                  haptics.medium();
                  onPickMagicLink(magicEmail);
                }
              }}
              haptic="none"
              style={[
                styles.magicSend,
                !magicEmail && { opacity: 0.4 },
              ]}
            >
              <LinearGradient
                colors={[aurora.cyan, aurora.iris]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.magicSendText}>Enviar</Text>
            </PressableScale>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

function MethodButton({
  icon,
  iconColor,
  label,
  desc,
  badge,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  label: string;
  desc?: string;
  badge?: string;
  onPress?: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="tap"
      pressedScale={0.98}
      style={styles.methodBtn}
    >
      <View style={styles.methodIconBox}>
        <Ionicons
          name={icon}
          size={20}
          color={iconColor ?? textTokens.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.methodLabel}>{label}</Text>
        {desc ? <Text style={styles.methodDesc}>{desc}</Text> : null}
      </View>
      {badge ? (
        <LinearGradient
          colors={[aurora.cyan, aurora.iris]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.methodBadge}
        >
          <Text style={styles.methodBadgeText}>{badge}</Text>
        </LinearGradient>
      ) : null}
      <Ionicons
        name="chevron-forward"
        size={16}
        color={textTokens.tertiary}
        style={{ marginLeft: 4 }}
      />
    </PressableScale>
  );
}

// ══════════════════════════════════════════════════════════════════════
// STEP 2 — CREDENTIALS (Email + password)
// ══════════════════════════════════════════════════════════════════════

function CredentialsStep({
  onSubmit,
  onBack,
}: {
  onSubmit: () => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      haptics.error();
      Alert.alert('Atenção', 'Preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    haptics.medium();
    try {
      // Em prod, login real; após OK, vai pra 2FA
      await login(email.trim(), password);
      haptics.success();
      onSubmit();
    } catch {
      haptics.error();
      Alert.alert('Erro', 'Credenciais incorretas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View
      key="credentials"
      entering={SlideInRight.duration(400)}
      exiting={SlideOutLeft.duration(300)}
      style={{ flex: 1 }}
    >
      <BackButton onPress={onBack} />

      <View style={styles.headerCenter}>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>Suas </Text>
          <GradientText
            italic
            fontSize={28}
            fontWeight="400"
            letterSpacing={-0.85}
            fontFamily={SERIF_ITALIC_FAMILY}
          >
            credenciais
          </GradientText>
        </View>
        <Text style={styles.subtitle}>Entre com email e senha</Text>
      </View>

      <View style={{ gap: 14 }}>
        <AuroraInput
          ref={emailRef}
          label="Email"
          icon="mail-outline"
          placeholder="voce@exemplo.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          autoFocus
          returnKeyType="next"
          onSubmitEditing={() => passRef.current?.focus()}
        />
        <AuroraInput
          ref={passRef}
          label="Senha"
          icon="lock-closed-outline"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="password"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          suffix={
            <Pressable
              onPress={() => {
                haptics.select();
                setShowPassword((s) => !s);
              }}
              hitSlop={10}
              style={{ padding: 4 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={textTokens.tertiary}
              />
            </Pressable>
          }
        />

        <Pressable
          onPress={() =>
            Alert.alert('Em breve', 'Recuperação de senha em breve.')
          }
          style={styles.forgotAlign}
        >
          <Text style={styles.forgotLink}>Esqueceu a senha?</Text>
        </Pressable>

        <View style={{ marginTop: 8 }}>
          <AuroraButton
            label="Continuar"
            onPress={handleSubmit}
            loading={loading}
            variant="gradient"
            size="lg"
            icon="arrow-forward"
            iconPosition="right"
            fullWidth
            haptic="medium"
          />
        </View>
      </View>
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════════════
// STEP 3 — 2FA (OTP 6 digits)
// ══════════════════════════════════════════════════════════════════════

function TwoFactorStep({
  onVerify,
  onBack,
}: {
  onVerify: () => void;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const otpRef = useRef<OTPInputHandle>(null);

  useEffect(() => {
    otpRef.current?.focus();
  }, []);

  const handleComplete = async (code: string) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    // mock: "123456" ou qualquer 6 dígitos passa pra demo
    if (code === '123456' || code.length === 6) {
      haptics.success();
      onVerify();
    } else {
      otpRef.current?.shakeAndClear();
      setLoading(false);
    }
  };

  const handleResend = () => {
    haptics.tap();
    setResent(true);
    setTimeout(() => setResent(false), 3000);
  };

  return (
    <Animated.View
      key="twofa"
      entering={SlideInRight.duration(400)}
      exiting={SlideOutLeft.duration(300)}
      style={{ flex: 1 }}
    >
      <BackButton onPress={onBack} />

      <View style={styles.headerCenter}>
        <Animated.View
          entering={ZoomIn.delay(100).springify().damping(15)}
          style={styles.lockSmallWrap}
        >
          <LinearGradient
            colors={[aurora.cyan, aurora.iris]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.lockSmall}
          >
            <Ionicons name="lock-closed" size={24} color="#fff" />
          </LinearGradient>
        </Animated.View>

        <View style={[styles.headingRow, { marginTop: 6 }]}>
          <Text style={[styles.heading, { fontSize: 24 }]}>Verificação </Text>
        </View>
        <GradientText
          italic
          fontSize={24}
          fontWeight="400"
          letterSpacing={-0.7}
          fontFamily={SERIF_ITALIC_FAMILY}
        >
          em duas etapas
        </GradientText>
        <Text style={[styles.subtitle, { marginTop: 8 }]}>
          Digite o código de 6 dígitos do seu autenticador
        </Text>
      </View>

      <OTPInput
        ref={otpRef}
        onComplete={handleComplete}
        disabled={loading}
        style={{ marginBottom: 24 }}
      />

      <View style={{ alignItems: 'center' }}>
        {loading ? (
          <View style={styles.resendInline}>
            <ActivityIndicator size="small" color={aurora.cyan} />
            <Text style={styles.resendText}>Verificando...</Text>
          </View>
        ) : (
          <View style={styles.resendInline}>
            <Text style={styles.resendText}>Não recebeu o código? </Text>
            {resent ? (
              <Text style={styles.resentOk}>✓ Reenviado</Text>
            ) : (
              <PressableScale onPress={handleResend} haptic="none">
                <Text style={styles.cyanLink}>Reenviar</Text>
              </PressableScale>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════════════
// STEP 4 — MAGIC LINK SENT
// ══════════════════════════════════════════════════════════════════════

function MagicSentStep({ email, onBack }: { email: string; onBack: () => void }) {
  const sparkleRot = useSharedValue(0);
  const sparkleScale = useSharedValue(1);

  useEffect(() => {
    sparkleRot.value = withRepeat(
      withSequence(
        withTiming(20, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
        withTiming(-20, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    sparkleScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000 }),
        withTiming(1, { duration: 1000 }),
      ),
      -1,
      false,
    );
  }, [sparkleRot, sparkleScale]);

  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${sparkleRot.value}deg` },
      { scale: sparkleScale.value },
    ],
  }));

  return (
    <Animated.View
      key="magic-sent"
      entering={SlideInRight.duration(400)}
      exiting={SlideOutLeft.duration(300)}
      style={styles.stepCenter}
    >
      <Animated.View
        entering={ZoomIn.springify().damping(15)}
        style={styles.bigIconWrap}
      >
        <LinearGradient
          colors={[aurora.cyan, aurora.iris]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bigIconSquare}
        >
          <Ionicons name="mail" size={48} color="#fff" />
        </LinearGradient>
        <Animated.Text style={[styles.sparkle, sparkleStyle]}>✨</Animated.Text>
      </Animated.View>

      <View style={[styles.headerCenter, { marginBottom: 8 }]}>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>Verifique seu </Text>
          <GradientText
            italic
            fontSize={28}
            fontWeight="400"
            letterSpacing={-0.85}
            fontFamily={SERIF_ITALIC_FAMILY}
          >
            email
          </GradientText>
        </View>
      </View>

      <Text style={[styles.subtitle, { marginTop: 4 }]}>
        Enviamos um link mágico para
      </Text>
      <Text style={styles.emailBold}>{email}</Text>

      <Text style={styles.mutedCenter}>
        Clique no link no email para entrar. Você pode fechar esta janela.
      </Text>

      <PressableScale onPress={onBack} haptic="tap" style={{ padding: 10 }}>
        <Text style={styles.cyanLink}>← Tentar outra forma</Text>
      </PressableScale>
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════════════
// STEP 5 — SUCCESS
// ══════════════════════════════════════════════════════════════════════

function SuccessStep() {
  return (
    <Animated.View
      key="success"
      entering={FadeIn.duration(400)}
      style={styles.stepCenter}
    >
      <Animated.View
        entering={ZoomIn.springify().damping(12)}
        style={styles.bigIconCircleWrap}
      >
        <LinearGradient
          colors={[semantic.success, aurora.cyan]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bigIconCircle}
        >
          <Ionicons name="checkmark" size={48} color="#fff" />
        </LinearGradient>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(500).duration(500)}
        style={styles.headerCenter}
      >
        <View style={styles.headingRow}>
          <Text style={styles.heading}>Tudo </Text>
          <GradientText
            italic
            fontSize={28}
            fontWeight="400"
            letterSpacing={-0.85}
            fontFamily={SERIF_ITALIC_FAMILY}
          >
            certo
          </GradientText>
        </View>
      </Animated.View>
      <Animated.Text
        entering={FadeInDown.delay(650).duration(500)}
        style={styles.subtitle}
      >
        Redirecionando para o app...
      </Animated.Text>
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="tap"
      pressedScale={0.96}
      style={styles.backBtn}
    >
      <Ionicons name="chevron-back" size={14} color={textTokens.secondary} />
      <Text style={styles.backText}>Voltar</Text>
    </PressableScale>
  );
}

// ══════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
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
  cardWrap: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  card: {
    minHeight: 540,
  },

  // Step centering
  stepCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },

  // Headers
  headerCenter: {
    alignItems: 'center',
    marginBottom: 28,
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
  cyanLink: {
    color: aurora.cyan,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    letterSpacing: -0.05,
  },

  // Back button
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginLeft: -10,
    marginBottom: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  backText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    letterSpacing: -0.05,
  },

  // ── FaceID scanner ──
  pulseRing: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: aurora.cyan,
  },
  scanLine: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: 3,
    borderRadius: 2,
    shadowColor: aurora.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    shadowOpacity: 0.8,
  },
  scannerCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── MethodButton ──
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderColor: surface.glassBorderActive,
  },
  methodIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: surface.glassHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodLabel: {
    color: textTokens.primary,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  methodDesc: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
    letterSpacing: -0.05,
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  methodBadgeText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  methodDivider: {
    height: 1,
    backgroundColor: surface.glassBorder,
    marginVertical: 8,
  },

  // ── Magic input inline ──
  magicInputBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    backgroundColor: surface.glass,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: surface.glassBorderActive,
    alignItems: 'center',
  },
  magicInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    color: textTokens.primary,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  magicSend: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  magicSendText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },

  // ── Credentials ──
  forgotAlign: {
    alignSelf: 'flex-end',
    marginTop: -4,
    padding: 4,
  },
  forgotLink: {
    color: aurora.cyan,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    letterSpacing: -0.05,
  },

  // ── 2FA ──
  lockSmallWrap: {
    width: 56,
    height: 56,
    marginBottom: 16,
    shadowColor: aurora.cyan,
    shadowOffset: { width: 0, height: 15 },
    shadowRadius: 24,
    shadowOpacity: 0.55,
    elevation: 10,
  },
  lockSmall: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resendText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  resentOk: {
    color: semantic.success,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },

  // ── Big gradient icons (magic / success) ──
  bigIconWrap: {
    width: 96,
    height: 96,
    marginBottom: 24,
    shadowColor: aurora.cyan,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 40,
    shadowOpacity: 0.5,
    elevation: 14,
    position: 'relative',
  },
  bigIconSquare: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigIconCircleWrap: {
    width: 96,
    height: 96,
    marginBottom: 24,
    shadowColor: semantic.success,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 40,
    shadowOpacity: 0.5,
    elevation: 14,
  },
  bigIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    position: 'absolute',
    top: -8,
    right: -12,
    fontSize: 24,
  },
  emailBold: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    marginTop: 4,
    marginBottom: 24,
  },
  mutedCenter: {
    color: textTokens.tertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 20,
    lineHeight: 18,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    color: textTokens.tertiary,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    letterSpacing: 0.1,
  },
});

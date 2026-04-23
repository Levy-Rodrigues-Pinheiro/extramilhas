import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
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
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { useReferral, useApplyReferralCode } from '../src/hooks/useReferral';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
  AnimatedNumber,
  ShimmerSkeleton,
  FloatingLabelInput,
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
 * Referral v2 — shareable card premium estilo Apple Invite / Apple Gift Card.
 *
 * Signature: o código é o *centerpiece* — big letters, gradient bg,
 * shimmer sweep idle, códigos tappable (tap = copy com haptic success).
 * Share button aurora CTA.
 */
export default function ReferralScreen() {
  const { data, isLoading, error } = useReferral();
  const apply = useApplyReferralCode();
  const [codeInput, setCodeInput] = useState('');

  const handleShare = async () => {
    if (!data?.shareUrl) return;
    haptics.medium();
    try {
      await Share.share({
        message: `🛩️ Milhas Extras — use meu código ${data.code} e ganhe 30 dias Premium grátis: ${data.shareUrl}`,
      });
    } catch {}
  };

  const handleCopy = async () => {
    if (!data?.code) return;
    await Clipboard.setStringAsync(data.code);
    haptics.success();
    Alert.alert('Copiado!', `"${data.code}" na área de transferência.`);
  };

  const handleApply = async () => {
    try {
      haptics.medium();
      const result = await apply.mutateAsync(codeInput.trim().toUpperCase());
      haptics.success();
      Alert.alert('🎉 Sucesso!', result.message);
      setCodeInput('');
    } catch (err: any) {
      haptics.error();
      Alert.alert('Erro', err?.response?.data?.message || 'Falha ao aplicar código');
    }
  };

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
              <Text style={styles.title}>Indique e ganhe</Text>
              <Text style={styles.subtitle}>30 dias Premium pra cada amigo</Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <View style={{ gap: 14 }}>
                <ShimmerSkeleton height={220} radius="xl" />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <ShimmerSkeleton height={80} style={{ flex: 1 }} radius="lg" />
                  <ShimmerSkeleton height={80} style={{ flex: 1 }} radius="lg" />
                  <ShimmerSkeleton height={80} style={{ flex: 1 }} radius="lg" />
                </View>
              </View>
            ) : error || !data ? (
              <View style={styles.errorCenter}>
                <Ionicons name="alert-circle" size={32} color={semantic.danger} />
                <Text style={styles.errorText}>Falha ao carregar referral.</Text>
              </View>
            ) : (
              <>
                {/* ─── Invite Card (signature moment) ─── */}
                <Animated.View
                  entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
                >
                  <InviteCard code={data.code} onCopy={handleCopy} onShare={handleShare} />
                </Animated.View>

                {/* ─── Stats ─── */}
                <Animated.View
                  entering={FadeInDown.delay(120).duration(motion.timing.medium).springify()}
                  style={styles.statsRow}
                >
                  <StatPill
                    icon="people"
                    value={data.referralsCount}
                    label="Convidados"
                    color={aurora.cyan}
                  />
                  <StatPill
                    icon="sparkles"
                    value={data.activeReferrals}
                    label="Ativos"
                    color={aurora.magenta}
                  />
                  <StatPill
                    icon="gift"
                    value={data.rewardDays}
                    label="Dias"
                    suffix="d"
                    color={premium.goldLight}
                    highlight
                  />
                </Animated.View>

                {/* ─── Como funciona ─── */}
                <Animated.View
                  entering={FadeInDown.delay(240).duration(motion.timing.medium)}
                  style={{ marginTop: space.md }}
                >
                  <Text style={styles.sectionLabel}>COMO FUNCIONA</Text>
                  <GlassCard radiusSize="lg" padding={18}>
                    <StepLine num={1} text="Compartilhe seu código com quem usa milhas." />
                    <StepLine
                      num={2}
                      text="Quando o amigo cadastra e usa o código, vocês dois ganham 30d Premium."
                    />
                    <StepLine
                      num={3}
                      text="Quanto mais amigos, mais tempo Premium — sem limite."
                      last
                    />
                  </GlassCard>
                </Animated.View>

                {/* ─── Aplicar código (se usuário pode) ─── */}
                {!data.referredBy && (
                  <Animated.View
                    entering={FadeInDown.delay(360).duration(motion.timing.medium)}
                    style={{ marginTop: space.md }}
                  >
                    <Text style={styles.sectionLabel}>TEM UM CÓDIGO?</Text>
                    <GlassCard radiusSize="lg" padding={18}>
                      <Text style={styles.applyHint}>
                        Se você acabou de se cadastrar (até 7 dias), pode aplicar o código de
                        quem te indicou.
                      </Text>

                      <View style={{ height: 14 }} />

                      <FloatingLabelInput
                        label="Código do amigo"
                        iconLeft="gift-outline"
                        value={codeInput}
                        onChangeText={(v) =>
                          setCodeInput(v.replace(/[^A-Za-z0-9]/g, '').toUpperCase())
                        }
                        maxLength={12}
                        autoCapitalize="characters"
                      />

                      <AuroraButton
                        label="Aplicar código"
                        onPress={handleApply}
                        loading={apply.isPending}
                        disabled={codeInput.length < 6}
                        variant="apple"
                        size="md"
                        icon="checkmark-circle"
                        iconPosition="left"
                        fullWidth
                      />
                    </GlassCard>
                  </Animated.View>
                )}

                {data.referredBy && (
                  <Animated.View
                    entering={FadeIn.delay(360).duration(motion.timing.medium)}
                    style={{ marginTop: space.md }}
                  >
                    <GlassCard
                      radiusSize="lg"
                      padding={14}
                      glow="success"
                      style={styles.thanksBox}
                    >
                      <View style={styles.thanksIcon}>
                        <Ionicons name="checkmark-circle" size={22} color={semantic.success} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.thanksTitle}>
                          Indicado por {data.referredBy.name}
                        </Text>
                        <Text style={styles.thanksText}>
                          30 dias Premium já aplicados na sua conta.
                        </Text>
                      </View>
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

// ─── InviteCard (signature) ─────────────────────────────────────────────

function InviteCard({
  code,
  onCopy,
  onShare,
}: {
  code: string;
  onCopy: () => void;
  onShare: () => void;
}) {
  // Shimmer sweep idle
  const shimmer = useSharedValue(0);

  React.useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [shimmer]);

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + shimmer.value * 0.35,
  }));

  return (
    <View style={inviteStyles.card}>
      {/* Aurora gradient bg */}
      <LinearGradient
        colors={gradients.aurora}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Shimmer */}
      <Animated.View style={[StyleSheet.absoluteFill, sheenStyle]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { height: '45%' }]}
        />
      </Animated.View>

      <View style={inviteStyles.content}>
        {/* Top: label + ícone */}
        <View style={inviteStyles.topRow}>
          <View style={inviteStyles.labelChip}>
            <Ionicons name="sparkles" size={11} color="#FFF" />
            <Text style={inviteStyles.labelText}>SEU CÓDIGO EXCLUSIVO</Text>
          </View>
        </View>

        {/* Code — tappable pra copy */}
        <PressableScale onPress={onCopy} haptic="none" style={{ alignItems: 'center' }}>
          <Text style={inviteStyles.code}>{code}</Text>
          <View style={inviteStyles.copyHint}>
            <Ionicons name="copy-outline" size={11} color="rgba(255,255,255,0.85)" />
            <Text style={inviteStyles.copyHintText}>toque pra copiar</Text>
          </View>
        </PressableScale>

        {/* Share CTA */}
        <View style={{ marginTop: space.md }}>
          <AuroraButton
            label="Compartilhar código"
            onPress={onShare}
            variant="ghost"
            size="lg"
            icon="share-social"
            iconPosition="left"
            fullWidth
            style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
            haptic="medium"
          />
        </View>
      </View>
    </View>
  );
}

// ─── StatPill ───────────────────────────────────────────────────────────

function StatPill({
  icon,
  value,
  label,
  suffix,
  color,
  highlight,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: number;
  label: string;
  suffix?: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <GlassCard radiusSize="lg" padding={12} glow={highlight ? 'gold' : 'none'} style={statStyles.card}>
      <View style={[statStyles.iconWrap, { backgroundColor: `${color}1F`, borderColor: `${color}55` }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <AnimatedNumber
        value={value}
        format="integer"
        suffix={suffix}
        style={[statStyles.value, { color }]}
      />
      <Text style={statStyles.label}>{label}</Text>
    </GlassCard>
  );
}

// ─── StepLine ───────────────────────────────────────────────────────────

function StepLine({ num, text, last }: { num: number; text: string; last?: boolean }) {
  return (
    <View style={stepStyles.row}>
      <View style={stepStyles.numCol}>
        <LinearGradient
          colors={gradients.auroraCyanMagenta}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={stepStyles.numCircle}
        >
          <Text style={stepStyles.numText}>{num}</Text>
        </LinearGradient>
        {!last && <View style={stepStyles.connector} />}
      </View>
      <Text style={stepStyles.text}>{text}</Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const inviteStyles = StyleSheet.create({
  card: {
    borderRadius: 28,
    overflow: 'hidden',
    minHeight: 220,
    shadowColor: aurora.magenta,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 18,
  },
  content: {
    padding: space.xl,
    zIndex: 1,
  },
  topRow: {
    alignItems: 'center',
    marginBottom: space.md,
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  labelText: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  code: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 44,
    letterSpacing: 6,
    textAlign: 'center',
    marginTop: 4,
  },
  copyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  copyHintText: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 0.3,
  },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 4,
  },
  value: {
    fontFamily: 'Inter_900Black',
    fontSize: 22,
    letterSpacing: -0.4,
  },
  label: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
});

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  numCol: {
    alignItems: 'center',
  },
  numCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    color: '#041220',
    fontFamily: 'Inter_900Black',
    fontSize: 12,
  },
  connector: {
    flex: 1,
    width: 1.5,
    backgroundColor: surface.glassBorder,
    minHeight: 14,
    marginTop: 2,
    marginBottom: 2,
  },
  text: {
    flex: 1,
    color: textTokens.primary,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 19,
    paddingTop: 3,
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
  errorCenter: {
    padding: space.xxl,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: semantic.danger,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: space.md,
  },
  sectionLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  applyHint: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  thanksBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thanksIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: semantic.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thanksTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  thanksText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
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
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSubscription, useSubscriptionPlans, useSubscribePlan } from '../src/hooks/useSubscription';
import { useAuthStore } from '../src/store/auth.store';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
  StaggerItem,
  ShimmerSkeleton,
  aurora,
  premium,
  semantic,
  system,
  surface,
  text as textTokens,
  space,
  gradients,
  motion,
  haptics,
} from '../src/components/primitives';

interface PlanFeatureRow {
  label: string;
  free: boolean;
  premium: boolean;
  pro: boolean;
}

const FEATURES: PlanFeatureRow[] = [
  { label: 'Bônus de transferência em tempo real', free: false, premium: true, pro: true },
  { label: 'Alertas ilimitados', free: false, premium: true, pro: true },
  { label: 'Histórico completo (90 dias)', free: false, premium: true, pro: true },
  { label: 'Calculadora de arbitragem completa', free: false, premium: true, pro: true },
  { label: 'Análise da carteira + sinais de expiração', free: false, premium: true, pro: true },
  { label: 'Artigos e guias exclusivos', free: false, premium: false, pro: true },
  { label: 'Suporte prioritário', free: false, premium: false, pro: true },
  { label: 'API de dados (desenvolvedores)', free: false, premium: false, pro: true },
];

export default function SubscriptionScreen() {
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const subscribePlan = useSubscribePlan();
  const { user } = useAuthStore();

  const currentPlan: string = user?.plan ?? 'FREE';

  const handleSubscribe = async (planName: 'PREMIUM' | 'PRO') => {
    const planDetails = plans?.find((p) => p.name === planName);
    if (!planDetails) {
      haptics.error();
      Alert.alert('Erro', 'Plano não encontrado.');
      return;
    }

    haptics.medium();
    Alert.alert(
      `Assinar ${planName === 'PREMIUM' ? 'Premium' : 'Pro'}`,
      `Confirmar assinatura do plano ${
        planName === 'PREMIUM' ? 'Premium (R$19,90/mês)' : 'Pro (R$39,90/mês)'
      }?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await subscribePlan.mutateAsync(planDetails.id);
              haptics.success();
              Alert.alert('Sucesso!', 'Assinatura ativada com sucesso.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch {
              haptics.error();
              Alert.alert('Erro', 'Não foi possível processar. Tente novamente.');
            }
          },
        },
      ],
    );
  };

  return (
    <AuroraBackground intensity="hero" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
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
            <Text style={styles.title}>Planos</Text>
            <Text style={styles.subtitle}>Escolha o melhor pra você</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {plansLoading ? (
          <View style={{ padding: space.md, gap: 14 }}>
            <ShimmerSkeleton height={320} radius="xl" />
            <ShimmerSkeleton height={320} radius="xl" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero */}
            <Animated.View
              entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
              style={styles.heroSection}
            >
              <View style={styles.diamondWrap}>
                <DiamondIcon />
              </View>
              <Text style={styles.heroTitle}>Libere todo o poder</Text>
              <Text style={styles.heroSubtitle}>
                Alertas em tempo real + calculadora completa + análise personalizada.
              </Text>
            </Animated.View>

            {/* PREMIUM Plan (Most Popular) */}
            <StaggerItem index={0} baseDelay={120}>
              <GoldPlanCard
                name="Premium"
                price="19,90"
                period="/mês"
                badge="MAIS POPULAR"
                isCurrent={currentPlan === 'PREMIUM'}
                features={FEATURES.map((f) => ({ label: f.label, included: f.premium }))}
                onSubscribe={() => handleSubscribe('PREMIUM')}
                isSubscribing={subscribePlan.isPending}
                emphasized
              />
            </StaggerItem>

            {/* PRO Plan */}
            <StaggerItem index={1} baseDelay={120}>
              <AuroraPlanCard
                name="Pro"
                price="39,90"
                period="/mês"
                badge="TUDO INCLUÍDO"
                isCurrent={currentPlan === 'PRO'}
                features={FEATURES.map((f) => ({ label: f.label, included: f.pro }))}
                onSubscribe={() => handleSubscribe('PRO')}
                isSubscribing={subscribePlan.isPending}
              />
            </StaggerItem>

            {/* FREE Plan */}
            <StaggerItem index={2} baseDelay={120}>
              <FreePlanCard
                features={FEATURES.map((f) => ({ label: f.label, included: f.free }))}
                isCurrent={currentPlan === 'FREE'}
              />
            </StaggerItem>

            {/* Trust badges */}
            <Animated.View
              entering={FadeIn.delay(400).duration(motion.timing.medium)}
              style={styles.trustRow}
            >
              <TrustBadge icon="shield-checkmark" text="Cancele quando quiser" />
              <TrustBadge icon="sync" text="Renova automaticamente" />
              <TrustBadge icon="card" text="Pagamento seguro" />
            </Animated.View>

            {/* Skip link */}
            <PressableScale
              onPress={() => {
                haptics.tap();
                router.back();
              }}
              haptic="none"
              style={{ alignItems: 'center', marginTop: space.lg }}
            >
              <Text style={styles.skipText}>Continuar com plano gratuito</Text>
            </PressableScale>
          </ScrollView>
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── GoldPlanCard (Premium — destaque principal com gold gradient) ─────

function GoldPlanCard({
  name,
  price,
  period,
  badge,
  isCurrent,
  features,
  onSubscribe,
  isSubscribing,
  emphasized,
}: {
  name: string;
  price: string;
  period: string;
  badge?: string;
  isCurrent: boolean;
  features: Array<{ label: string; included: boolean }>;
  onSubscribe: () => void;
  isSubscribing: boolean;
  emphasized?: boolean;
}) {
  // Shimmer sweep sobre o card (premium feel)
  const shimmer = useSharedValue(0);

  React.useEffect(() => {
    if (!emphasized) return;
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [shimmer, emphasized]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + shimmer.value * 0.25,
  }));

  return (
    <View style={planStyles.card}>
      {/* Gold gradient bg */}
      <LinearGradient
        colors={gradients.premium}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Darken for contrast */}
      <LinearGradient
        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Sheen */}
      <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { height: '45%' }]}
        />
      </Animated.View>

      <View style={planStyles.content}>
        {badge && (
          <View style={[planStyles.popularBadge, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            <Ionicons name="star" size={11} color={premium.goldLight} />
            <Text style={[planStyles.popularText, { color: premium.goldLight }]}>
              {badge}
            </Text>
          </View>
        )}

        <Text style={[planStyles.planName, { color: textTokens.onGold }]}>{name}</Text>

        <View style={planStyles.priceRow}>
          <Text style={[planStyles.priceR, { color: textTokens.onGold }]}>R$</Text>
          <Text style={[planStyles.price, { color: textTokens.onGold }]}>{price}</Text>
          <Text style={[planStyles.period, { color: 'rgba(30,18,2,0.65)' }]}>{period}</Text>
        </View>

        <View style={planStyles.featureList}>
          {features.map((f) => (
            <FeatureRow
              key={f.label}
              label={f.label}
              included={f.included}
              colorOverride={textTokens.onGold}
              checkColor={textTokens.onGold}
            />
          ))}
        </View>

        {isCurrent ? (
          <View style={[planStyles.currentBadge, { backgroundColor: 'rgba(0,0,0,0.25)' }]}>
            <Ionicons name="checkmark-circle" size={16} color={textTokens.onGold} />
            <Text style={[planStyles.currentText, { color: textTokens.onGold }]}>
              Plano atual
            </Text>
          </View>
        ) : (
          <AuroraButton
            label={`Assinar ${name}`}
            onPress={onSubscribe}
            loading={isSubscribing}
            variant="ghost"
            size="lg"
            icon="rocket"
            iconPosition="left"
            fullWidth
            style={{ marginTop: 12, backgroundColor: 'rgba(0,0,0,0.25)' }}
            haptic="medium"
          />
        )}
      </View>
    </View>
  );
}

// ─── AuroraPlanCard (Pro — aurora gradient) ─────────────────────────────

function AuroraPlanCard({
  name,
  price,
  period,
  badge,
  isCurrent,
  features,
  onSubscribe,
  isSubscribing,
}: {
  name: string;
  price: string;
  period: string;
  badge?: string;
  isCurrent: boolean;
  features: Array<{ label: string; included: boolean }>;
  onSubscribe: () => void;
  isSubscribing: boolean;
}) {
  return (
    <View style={planStyles.card}>
      <LinearGradient
        colors={gradients.aurora}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { height: '45%' }]}
      />

      <View style={planStyles.content}>
        {badge && (
          <View style={[planStyles.popularBadge, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            <Ionicons name="diamond" size={11} color="#FFF" />
            <Text style={[planStyles.popularText, { color: '#FFF' }]}>{badge}</Text>
          </View>
        )}

        <Text style={[planStyles.planName, { color: '#FFF' }]}>{name}</Text>

        <View style={planStyles.priceRow}>
          <Text style={[planStyles.priceR, { color: '#FFF' }]}>R$</Text>
          <Text style={[planStyles.price, { color: '#FFF' }]}>{price}</Text>
          <Text style={[planStyles.period, { color: 'rgba(255,255,255,0.7)' }]}>{period}</Text>
        </View>

        <View style={planStyles.featureList}>
          {features.map((f) => (
            <FeatureRow
              key={f.label}
              label={f.label}
              included={f.included}
              colorOverride="#FFF"
              checkColor="#FFF"
            />
          ))}
        </View>

        {isCurrent ? (
          <View style={[planStyles.currentBadge, { backgroundColor: 'rgba(0,0,0,0.25)' }]}>
            <Ionicons name="checkmark-circle" size={16} color="#FFF" />
            <Text style={[planStyles.currentText, { color: '#FFF' }]}>Plano atual</Text>
          </View>
        ) : (
          <AuroraButton
            label={`Assinar ${name}`}
            onPress={onSubscribe}
            loading={isSubscribing}
            variant="ghost"
            size="lg"
            icon="diamond"
            iconPosition="left"
            fullWidth
            style={{ marginTop: 12, backgroundColor: 'rgba(0,0,0,0.25)' }}
            haptic="medium"
          />
        )}
      </View>
    </View>
  );
}

// ─── FreePlanCard ───────────────────────────────────────────────────────

function FreePlanCard({
  features,
  isCurrent,
}: {
  features: Array<{ label: string; included: boolean }>;
  isCurrent: boolean;
}) {
  return (
    <GlassCard radiusSize="xl" padding={20} style={{ marginTop: space.sm, marginBottom: space.sm }}>
      <Text style={[planStyles.planName, { color: textTokens.primary }]}>Gratuito</Text>

      <View style={planStyles.priceRow}>
        <Text style={[planStyles.priceR, { color: textTokens.primary }]}>R$</Text>
        <Text style={[planStyles.price, { color: textTokens.primary }]}>0</Text>
        <Text style={[planStyles.period, { color: textTokens.muted }]}>/mês</Text>
      </View>

      <View style={planStyles.featureList}>
        {features.map((f) => (
          <FeatureRow key={f.label} label={f.label} included={f.included} />
        ))}
      </View>

      {isCurrent && (
        <View style={[planStyles.currentBadge, { backgroundColor: surface.glass }]}>
          <Ionicons name="checkmark-circle" size={16} color={aurora.cyan} />
          <Text style={[planStyles.currentText, { color: aurora.cyan }]}>Plano atual</Text>
        </View>
      )}
    </GlassCard>
  );
}

// ─── FeatureRow ─────────────────────────────────────────────────────────

function FeatureRow({
  label,
  included,
  colorOverride,
  checkColor,
}: {
  label: string;
  included: boolean;
  colorOverride?: string;
  checkColor?: string;
}) {
  return (
    <View style={planStyles.featureRow}>
      <Ionicons
        name={included ? 'checkmark-circle' : 'close-circle-outline'}
        size={17}
        color={included ? checkColor ?? semantic.success : 'rgba(128,128,128,0.55)'}
      />
      <Text
        style={[
          planStyles.featureLabel,
          { color: colorOverride ?? textTokens.primary },
          !included && { opacity: 0.45, textDecorationLine: 'line-through' },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── DiamondIcon (hero) ─────────────────────────────────────────────────

function DiamondIcon() {
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    rotate.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
        withTiming(-1, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [rotate, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value * 8}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.diamondIcon, style]}>
      <LinearGradient
        colors={gradients.aurora}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Ionicons name="diamond" size={44} color="#FFF" />
    </Animated.View>
  );
}

function TrustBadge({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.trustBadge}>
      <Ionicons name={icon} size={14} color={textTokens.muted} />
      <Text style={styles.trustText}>{text}</Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const planStyles = StyleSheet.create({
  card: {
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: space.md,
    minHeight: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  content: {
    padding: space.xl,
    zIndex: 1,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  popularText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  planName: {
    fontFamily: 'Inter_900Black',
    fontSize: 36,
    letterSpacing: -1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    marginBottom: 20,
  },
  priceR: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    marginRight: 2,
  },
  price: {
    fontFamily: 'Inter_900Black',
    fontSize: 42,
    letterSpacing: -1.4,
  },
  period: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    marginLeft: 4,
  },
  featureList: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    flex: 1,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 14,
  },
  currentText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
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
    alignItems: 'center',
  },
  title: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 1,
  },

  scrollContent: {
    padding: space.md,
    paddingBottom: 60,
  },

  heroSection: {
    alignItems: 'center',
    paddingVertical: space.xl,
  },
  diamondWrap: {
    marginBottom: space.md,
  },
  diamondIcon: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: aurora.magenta,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 14,
  },
  heroTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_900Black',
    fontSize: 30,
    letterSpacing: -0.8,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 300,
  },

  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
    marginTop: space.md,
    paddingHorizontal: 8,
  },
  trustBadge: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  trustText: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    textAlign: 'center',
  },

  skipText: {
    color: aurora.cyan,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    paddingVertical: 6,
  },
});

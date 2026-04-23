import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Share, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Easing,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import api from '../src/lib/api';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
  AnimatedNumber,
  ShimmerSkeleton,
  WrappedStoryStack,
  type WrappedStory,
  aurora,
  premium,
  semantic,
  text as textTokens,
  space,
  gradients,
  haptics,
} from '../src/components/primitives';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Retro {
  userName: string;
  weekStart: string;
  weekEnd: string;
  stats: {
    notificationsReceived: number;
    bonusAlertsReceived: number;
    missionsProgressed: number;
    currentStreak: number;
    longestStreak: number;
    walletTotalMiles: number;
    walletValueBrl: number;
  };
  topBonus: { from: string; to: string; bonusPercent: number } | null;
}

/**
 * Retrospective v2 — Spotify Wrapped / Apple Fitness Year in Review style.
 *
 * Full-screen story stack: cada story = 1 highlight da semana.
 * Auto-advance + swipe gestures + hold to pause.
 */
export default function RetrospectiveScreen() {
  const { t } = useTranslation();
  const [data, setData] = useState<Retro | null>(null);
  const [loading, setLoading] = useState(true);
  const [storiesOpen, setStoriesOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/users/retrospective/weekly');
        setData(res.data as Retro);
      } catch {
        Alert.alert(t('common.error'), t('errors.generic'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const share = async () => {
    if (!data) return;
    haptics.tap();
    const lines = [
      `📊 Minha semana no Milhas Extras:`,
      ``,
      `💰 Carteira: R$ ${data.stats.walletValueBrl.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
      })} (${data.stats.walletTotalMiles.toLocaleString('pt-BR')} mi)`,
      `🔔 ${data.stats.bonusAlertsReceived} bônus descobertos`,
      `🔥 ${data.stats.currentStreak} dias de streak`,
    ];
    if (data.topBonus) {
      lines.push(`🎁 Top: ${data.topBonus.bonusPercent}% ${data.topBonus.from}→${data.topBonus.to}`);
    }
    lines.push('');
    lines.push('Calcule sua carteira em R$ no Milhas Extras:');
    lines.push('https://milhasextras.com.br');
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      /* cancelou */
    }
  };

  if (loading) {
    return (
      <AuroraBackground intensity="hero" style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={styles.center}>
            <ShimmerSkeleton width={280} height={40} radius="md" />
            <View style={{ height: 20 }} />
            <ShimmerSkeleton width={240} height={16} radius="sm" />
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  if (!data) {
    return (
      <AuroraBackground intensity="hero" style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={styles.center}>
            <Text style={styles.errorText}>Não conseguimos gerar sua semana.</Text>
            <View style={{ height: 16 }} />
            <AuroraButton label="Voltar" onPress={() => router.back()} variant="ghost" />
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  // Full-screen story stack
  if (storiesOpen) {
    return (
      <WrappedStoryStack
        stories={buildStories(data)}
        onFinish={() => setStoriesOpen(false)}
        onClose={() => setStoriesOpen(false)}
      />
    );
  }

  // Preview/teaser screen
  return (
    <AuroraBackground intensity="hero" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={{ flex: 1 }} />
          <PressableScale onPress={share} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="share-outline" size={20} color={textTokens.primary} />
          </PressableScale>
        </View>

        <View style={styles.teaser}>
          <Animated.View entering={FadeInDown.duration(600).springify().damping(22)}>
            <View style={styles.teaserIconWrap}>
              <View style={styles.teaserIconHalo} />
              <LinearGradient
                colors={gradients.aurora}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.teaserIcon}
              >
                <Ionicons name="sparkles" size={44} color="#FFF" />
              </LinearGradient>
            </View>
          </Animated.View>

          <Animated.Text
            entering={FadeInUp.delay(200).duration(500)}
            style={styles.teaserLabel}
          >
            SUA SEMANA ESTÁ PRONTA
          </Animated.Text>

          <Animated.Text
            entering={FadeInUp.delay(300).duration(500)}
            style={styles.teaserTitle}
          >
            Veja o que você fez em milhas
          </Animated.Text>

          <Animated.Text
            entering={FadeInUp.delay(400).duration(500)}
            style={styles.teaserSubtitle}
          >
            7 momentos · toque pra abrir
          </Animated.Text>

          <Animated.View
            entering={FadeInUp.delay(550).duration(500)}
            style={{ marginTop: space.xxl, width: '100%' }}
          >
            <AuroraButton
              label="Ver minha semana"
              onPress={() => {
                haptics.medium();
                setStoriesOpen(true);
              }}
              variant="primary"
              size="lg"
              icon="play"
              iconPosition="left"
              fullWidth
              haptic="none"
            />
          </Animated.View>
        </View>
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── Build stories ──────────────────────────────────────────────────────

function buildStories(data: Retro): WrappedStory[] {
  return [
    // Story 1: Intro
    {
      background: ['#0A0F1E', '#1E3A8A', '#701A75'] as [string, string, string],
      render: () => (
        <View style={storyStyles.content}>
          <Animated.View entering={FadeInDown.duration(600).springify().damping(22)}>
            <View style={storyStyles.hugeIcon}>
              <Ionicons name="sparkles" size={72} color="#FFF" />
            </View>
          </Animated.View>
          <Animated.Text
            entering={FadeInUp.delay(300).duration(500)}
            style={storyStyles.kicker}
          >
            SEMANA DE {formatWeekRange(data.weekStart, data.weekEnd)}
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(400).duration(500)}
            style={storyStyles.hugeTitle}
          >
            Olá,{'\n'}
            {data.userName.split(' ')[0]}.
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(500).duration(500)}
            style={storyStyles.lede}
          >
            Essa foi{'\n'}sua semana.
          </Animated.Text>
        </View>
      ),
    },

    // Story 2: Wallet value
    {
      background: ['#0F8A3C', '#30D158', '#66E88A'] as [string, string, string],
      render: (p: SharedValue<number>) => (
        <View style={storyStyles.content}>
          <Animated.Text
            entering={FadeInDown.duration(400)}
            style={storyStyles.kicker}
          >
            SUA CARTEIRA HOJE VALE
          </Animated.Text>
          <Animated.View entering={FadeInUp.delay(200).duration(600).springify().damping(18)}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={storyStyles.currencyBig}>R$</Text>
              <AnimatedNumber
                value={data.stats.walletValueBrl}
                format="integer"
                style={storyStyles.valueHuge}
                duration={1600}
              />
            </View>
          </Animated.View>
          <Animated.Text entering={FadeInUp.delay(700).duration(500)} style={storyStyles.lede}>
            em{' '}
            <Text style={storyStyles.emphasis}>
              {data.stats.walletTotalMiles.toLocaleString('pt-BR')}
            </Text>{' '}
            milhas
          </Animated.Text>
        </View>
      ),
    },

    // Story 3: Notifications
    {
      background: ['#BF5AF2', '#5E5CE6', '#0A84FF'] as [string, string, string],
      render: () => (
        <View style={storyStyles.content}>
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={storyStyles.iconHalo}
          >
            <Ionicons name="notifications" size={48} color="#FFF" />
          </Animated.View>
          <Animated.Text
            entering={FadeInUp.delay(250).duration(500)}
            style={storyStyles.kicker}
          >
            VOCÊ FOI NOTIFICADO SOBRE
          </Animated.Text>
          <Animated.View entering={FadeInUp.delay(400).duration(600).springify()}>
            <AnimatedNumber
              value={data.stats.bonusAlertsReceived}
              format="integer"
              style={storyStyles.numHuge}
              duration={1200}
            />
          </Animated.View>
          <Animated.Text
            entering={FadeInUp.delay(800).duration(500)}
            style={storyStyles.lede}
          >
            {data.stats.bonusAlertsReceived === 1 ? 'bônus ativo' : 'bônus ativos'}
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(1000).duration(500)}
            style={storyStyles.small}
          >
            Total {data.stats.notificationsReceived} push
            {data.stats.notificationsReceived !== 1 ? 'es' : ''} recebido
            {data.stats.notificationsReceived !== 1 ? 's' : ''}
          </Animated.Text>
        </View>
      ),
    },

    // Story 4: Streak
    {
      background: ['#FF9F0A', '#FF6961', '#BF5AF2'] as [string, string, string],
      render: () => (
        <View style={storyStyles.content}>
          <FlameAnimated />
          <Animated.Text
            entering={FadeInUp.delay(300).duration(500)}
            style={storyStyles.kicker}
          >
            SEU STREAK ATUAL
          </Animated.Text>
          <Animated.View entering={FadeInUp.delay(500).duration(600).springify()}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <AnimatedNumber
                value={data.stats.currentStreak}
                format="integer"
                style={storyStyles.numHuge}
                duration={1200}
              />
              <Text style={storyStyles.unit}>dias</Text>
            </View>
          </Animated.View>
          {data.stats.longestStreak > data.stats.currentStreak && (
            <Animated.Text
              entering={FadeInUp.delay(900).duration(500)}
              style={storyStyles.small}
            >
              Seu recorde: {data.stats.longestStreak} dias 🏆
            </Animated.Text>
          )}
        </View>
      ),
    },

    // Story 5: Top bonus (se tiver)
    ...(data.topBonus
      ? [
          {
            background: [premium.goldDark, premium.gold, premium.goldLight] as [
              string,
              string,
              string,
            ],
            render: () => (
              <View style={storyStyles.content}>
                <Animated.View
                  entering={FadeInDown.duration(400)}
                  style={storyStyles.iconHalo}
                >
                  <Ionicons name="gift" size={52} color="#1A0F00" />
                </Animated.View>
                <Animated.Text
                  entering={FadeInUp.delay(250).duration(500)}
                  style={[storyStyles.kicker, { color: 'rgba(26,15,0,0.7)' }]}
                >
                  SEU TOP BÔNUS DA SEMANA
                </Animated.Text>
                <Animated.View entering={FadeInUp.delay(400).duration(600).springify()}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={[storyStyles.plusBig, { color: '#1A0F00' }]}>+</Text>
                    <AnimatedNumber
                      value={data.topBonus!.bonusPercent}
                      format="integer"
                      style={[storyStyles.numHuge, { color: '#1A0F00' }]}
                      duration={1200}
                    />
                    <Text style={[storyStyles.unit, { color: '#1A0F00' }]}>%</Text>
                  </View>
                </Animated.View>
                <Animated.Text
                  entering={FadeInUp.delay(700).duration(500)}
                  style={[storyStyles.lede, { color: '#1A0F00' }]}
                >
                  {data.topBonus!.from} → {data.topBonus!.to}
                </Animated.Text>
              </View>
            ),
          },
        ]
      : []),

    // Story 6: Missions progress
    {
      background: ['#0A0F1E', '#64D2FF', '#5E5CE6'] as [string, string, string],
      render: () => (
        <View style={storyStyles.content}>
          <Animated.View entering={FadeInDown.duration(400)} style={storyStyles.iconHalo}>
            <Ionicons name="trophy" size={48} color="#FFF" />
          </Animated.View>
          <Animated.Text entering={FadeInUp.delay(250).duration(500)} style={storyStyles.kicker}>
            VOCÊ AVANÇOU EM
          </Animated.Text>
          <Animated.View entering={FadeInUp.delay(400).duration(600).springify()}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <AnimatedNumber
                value={data.stats.missionsProgressed}
                format="integer"
                style={storyStyles.numHuge}
                duration={1200}
              />
              <Text style={storyStyles.unit}>
                missõ{data.stats.missionsProgressed !== 1 ? 'es' : 'ão'}
              </Text>
            </View>
          </Animated.View>
          <Animated.Text entering={FadeInUp.delay(700).duration(500)} style={storyStyles.small}>
            Cada uma te dá dias Premium grátis
          </Animated.Text>
        </View>
      ),
    },

    // Final: share CTA
    {
      background: ['#64D2FF', '#5E5CE6', '#BF5AF2'] as [string, string, string],
      render: () => (
        <View style={storyStyles.content}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={storyStyles.hugeIcon}>
              <Ionicons name="sparkles" size={64} color="#FFF" />
            </View>
          </Animated.View>
          <Animated.Text
            entering={FadeInUp.delay(300).duration(500)}
            style={storyStyles.finalTitle}
          >
            Bonita semana.{'\n'}Compartilha?
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(500).duration(500)}
            style={storyStyles.small}
          >
            Conte pra um amigo como está suas milhas.
          </Animated.Text>
        </View>
      ),
    },
  ];
}

// ─── FlameAnimated ─────────────────────────────────────────────────────

function FlameAnimated() {
  const flicker = useSharedValue(1);
  useEffect(() => {
    flicker.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.95, { duration: 250, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.05, { duration: 180, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 220 }),
      ),
      -1,
      false,
    );
  }, [flicker]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: flicker.value }],
  }));

  return (
    <Animated.View style={[storyStyles.iconHalo, style]}>
      <Text style={{ fontSize: 80 }}>🔥</Text>
    </Animated.View>
  );
}

function formatWeekRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${fmt(s)} – ${fmt(e)}`.toUpperCase();
}

// ─── Styles ─────────────────────────────────────────────────────────────

const storyStyles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    paddingVertical: space.xxl,
    gap: space.md,
  },
  hugeIcon: {
    width: 140,
    height: 140,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: space.md,
  },
  iconHalo: {
    width: 96,
    height: 96,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: space.md,
  },
  kicker: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  hugeTitle: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 56,
    lineHeight: 62,
    letterSpacing: -2,
    textAlign: 'center',
  },
  lede: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.6,
    textAlign: 'center',
    marginTop: space.md,
  },
  emphasis: {
    fontFamily: 'Inter_900Black',
    fontSize: 30,
    letterSpacing: -0.6,
  },
  valueHuge: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 92,
    lineHeight: 96,
    letterSpacing: -4,
  },
  currencyBig: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    marginRight: 6,
  },
  numHuge: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 100,
    lineHeight: 104,
    letterSpacing: -4.5,
  },
  unit: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    marginLeft: 8,
  },
  plusBig: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 40,
    marginRight: 2,
  },
  small: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  finalTitle: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1.4,
    textAlign: 'center',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  errorText: {
    color: textTokens.primary,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    textAlign: 'center',
  },
  teaser: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    paddingBottom: space.hero,
  },
  teaserIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xl,
  },
  teaserIconHalo: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: aurora.magentaSoft,
  },
  teaserIcon: {
    width: 100,
    height: 100,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: aurora.magenta,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 18,
  },
  teaserLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  teaserTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_900Black',
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    textAlign: 'center',
    paddingHorizontal: space.md,
  },
  teaserSubtitle: {
    color: textTokens.secondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
});

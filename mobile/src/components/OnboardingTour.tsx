import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Colors, Gradients } from '../lib/theme';

const SCREEN_W = Dimensions.get('window').width;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.primary },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  skipText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '600',
    padding: 8,
  },
  scroll: { flex: 1 },
  slide: {
    width: SCREEN_W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  text: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border.default,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary.light,
  },
  nextBtn: {
    marginHorizontal: 24,
    marginBottom: 20,
  },
  nextBtnGradient: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

/**
 * Tour guiado em 4 slides — mostrado 1x após welcome-quiz (ou on-demand via
 * botão no perfil). Explica conceitos-chave do app:
 *   1. Carteira de milhas
 *   2. Arbitragem
 *   3. Alertas
 *   4. Família
 *
 * Controle: AsyncStorage key `tour-completed-v1`.
 * Se user fizer skip ou finish, grava e não mostra de novo (a não ser que
 * invoque manualmente via `startTour={true}`).
 */

const TOUR_KEY = 'tour-completed-v1';

interface OnboardingTourProps {
  /** Se true, força abrir mesmo se tour já foi completado */
  force?: boolean;
  /** Callback após user terminar (ou pular) */
  onFinish?: () => void;
}

type IoniconName = keyof typeof Ionicons.glyphMap;

export function OnboardingTour({ force = false, onFinish }: OnboardingTourProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(force);
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (force) {
      setVisible(true);
      return;
    }
    (async () => {
      try {
        const done = await AsyncStorage.getItem(TOUR_KEY);
        if (!done) setVisible(true);
      } catch {
        // Silêncio — se storage falha, não bloqueia o app
      }
    })();
  }, [force]);

  const close = async (markDone: boolean) => {
    setVisible(false);
    if (markDone) {
      try {
        await AsyncStorage.setItem(TOUR_KEY, new Date().toISOString());
      } catch {
        /* ignore */
      }
    }
    onFinish?.();
  };

  const slides: Array<{
    icon: IoniconName;
    title: string;
    text: string;
    gradient: readonly [string, string];
  }> = [
    {
      icon: 'wallet',
      title: t('onboarding.step1_title'),
      text: t('onboarding.step1_text'),
      gradient: ['#3B82F6', '#8B5CF6'] as const,
    },
    {
      icon: 'trending-up',
      title: t('onboarding.step2_title'),
      text: t('onboarding.step2_text'),
      gradient: ['#10B981', '#3B82F6'] as const,
    },
    {
      icon: 'notifications',
      title: t('onboarding.step3_title'),
      text: t('onboarding.step3_text'),
      gradient: ['#F59E0B', '#EC4899'] as const,
    },
    {
      icon: 'people',
      title: t('onboarding.step4_title'),
      text: t('onboarding.step4_text'),
      gradient: ['#8B5CF6', '#EC4899'] as const,
    },
  ];

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (p !== page) setPage(p);
  };

  const next = () => {
    if (page < slides.length - 1) {
      scrollRef.current?.scrollTo({ x: (page + 1) * SCREEN_W, animated: true });
    } else {
      close(true);
    }
  };

  const isLast = page === slides.length - 1;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={() => close(true)}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => close(true)}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.skip')}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={styles.scroll}
        >
          {slides.map((s, i) => (
            <View
              key={i}
              style={styles.slide}
              accessible
              accessibilityLabel={`${s.title}. ${s.text}`}
            >
              <LinearGradient colors={s.gradient} style={styles.iconCircle}>
                <Ionicons name={s.icon} size={56} color="#fff" />
              </LinearGradient>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.text}>{s.text}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Dots */}
        <View style={styles.dotsRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {slides.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === page && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={next}
          activeOpacity={0.85}
          style={styles.nextBtn}
          accessibilityRole="button"
          accessibilityLabel={isLast ? t('onboarding.finish') : t('onboarding.next')}
        >
          <LinearGradient
            colors={Gradients.primary as unknown as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextBtnGradient}
          >
            <Text style={styles.nextText}>
              {isLast ? t('onboarding.finish') : t('onboarding.next')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

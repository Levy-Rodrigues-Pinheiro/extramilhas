import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useExplore } from '../src/hooks/useExplore';
import { ExploreSection } from '../src/components/ExploreSection';
import {
  AuroraBackground,
  GlassCard,
  PressableScale,
  SkeletonCard,
  EmptyStateIllustrated,
  aurora,
  surface,
  text as textTokens,
  space,
  motion,
  haptics,
} from '../src/components/primitives';

export default function ExploreScreen() {
  const { data, isLoading, isError } = useExplore();
  const sections = data?.sections ?? [];

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Explorar</Text>
            <Text style={styles.subtitle}>Ofertas curadas pra você</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={{ padding: space.md, gap: 14 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : isError ? (
          <View style={{ padding: space.md }}>
            <GlassCard radiusSize="xl" padding={0} glow="danger">
              <EmptyStateIllustrated
                variant="radar"
                title="Erro ao carregar"
                description="Verifique sua conexão e tente novamente."
              />
            </GlassCard>
          </View>
        ) : sections.length === 0 ? (
          <View style={{ padding: space.md }}>
            <GlassCard radiusSize="xl" padding={0}>
              <EmptyStateIllustrated
                variant="compass"
                title="Sem ofertas agora"
                description="Nada por aqui. Volte em breve!"
              />
            </GlassCard>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {sections.map((section: any, index: number) => (
              <Animated.View
                key={index}
                entering={FadeInDown.delay(index * 80).duration(motion.timing.medium)}
              >
                <ExploreSection
                  title={section.title}
                  icon={section.icon}
                  offers={section.offers ?? []}
                />
              </Animated.View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
}

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
    paddingVertical: space.md,
    paddingBottom: 120,
  },
});

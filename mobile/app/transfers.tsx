import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTransferPartnerships } from '../src/hooks/useTransfers';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
  StaggerItem,
  SkeletonCard,
  EmptyStateIllustrated,
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
 * Transfers v2 — lista de parcerias ativas.
 *
 * Foco: mostrar todas parcerias + bônus correntes. Para cálculo detalhado,
 * CTA pra transfer-calculator.
 */
export default function TransfersScreen() {
  const { data: partnerships, isLoading } = useTransferPartnerships();

  const activeWithBonus = (partnerships ?? []).filter(
    (p: any) => (p.currentBonus ?? 0) > 0,
  );
  const others = (partnerships ?? []).filter(
    (p: any) => (p.currentBonus ?? 0) === 0,
  );

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Transferências</Text>
            <Text style={styles.subtitle}>Parcerias ativas e bônus</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={{ padding: space.md, gap: 14 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : !partnerships || partnerships.length === 0 ? (
          <View style={{ padding: space.md }}>
            <GlassCard radiusSize="xl" padding={0}>
              <EmptyStateIllustrated
                variant="search"
                title="Nenhuma parceria"
                description="Volte em breve — parcerias mudam frequentemente."
              />
            </GlassCard>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Calc shortcut */}
            <Animated.View
              entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
            >
              <PressableScale
                onPress={() => {
                  haptics.tap();
                  router.push('/transfer-calculator' as any);
                }}
                haptic="none"
              >
                <GlassCard radiusSize="lg" padding={16} glow="cyan">
                  <View style={styles.calcRow}>
                    <View style={styles.calcIcon}>
                      <Ionicons name="calculator" size={22} color={aurora.cyan} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.calcTitle}>Vale a pena transferir?</Text>
                      <Text style={styles.calcText}>
                        Calcule ROI em R$ antes de transferir
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color={aurora.cyan} />
                  </View>
                </GlassCard>
              </PressableScale>
            </Animated.View>

            {/* Active with bonus */}
            {activeWithBonus.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>COM BÔNUS ATIVO</Text>
                <View style={{ gap: 10 }}>
                  {activeWithBonus.map((p: any, i: number) => (
                    <StaggerItem key={p.id} index={i} baseDelay={80}>
                      <PartnershipCard partnership={p} highlight />
                    </StaggerItem>
                  ))}
                </View>
              </>
            )}

            {/* Others */}
            {others.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: space.md }]}>
                  OUTRAS PARCERIAS
                </Text>
                <View style={{ gap: 10 }}>
                  {others.map((p: any, i: number) => (
                    <StaggerItem key={p.id} index={i} baseDelay={80}>
                      <PartnershipCard partnership={p} />
                    </StaggerItem>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
}

function PartnershipCard({
  partnership,
  highlight,
}: {
  partnership: any;
  highlight?: boolean;
}) {
  const bonus = partnership.currentBonus ?? 0;
  const baseRate = partnership.baseRate ?? 1;
  const effectiveRate = baseRate * (1 + bonus / 100);

  return (
    <GlassCard
      radiusSize="lg"
      padding={14}
      glow={highlight ? 'gold' : 'none'}
    >
      <View style={pCardStyles.header}>
        <Text style={pCardStyles.fromTo} numberOfLines={1}>
          {partnership.fromProgram?.name ?? '?'} →{' '}
          {partnership.toProgram?.name ?? '?'}
        </Text>
        {bonus > 0 && (
          <View style={pCardStyles.bonusTag}>
            <Text style={pCardStyles.bonusText}>+{bonus}%</Text>
          </View>
        )}
      </View>
      <View style={pCardStyles.rateRow}>
        <View style={pCardStyles.rateCol}>
          <Text style={pCardStyles.rateLabel}>Taxa base</Text>
          <Text style={pCardStyles.rateValue}>{baseRate.toFixed(1)}x</Text>
        </View>
        <Ionicons name="arrow-forward" size={14} color={textTokens.muted} />
        <View style={pCardStyles.rateCol}>
          <Text style={pCardStyles.rateLabel}>Com bônus</Text>
          <Text
            style={[
              pCardStyles.rateValue,
              bonus > 0 && { color: premium.goldLight },
            ]}
          >
            {effectiveRate.toFixed(2)}x
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

const pCardStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  fromTo: {
    flex: 1,
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  bonusTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: premium.goldSoft,
    borderWidth: 1,
    borderColor: `${premium.gold}66`,
  },
  bonusText: {
    color: premium.goldLight,
    fontFamily: 'Inter_900Black',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: surface.glassBorder,
  },
  rateCol: {
    flex: 1,
    alignItems: 'center',
  },
  rateLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  rateValue: {
    color: textTokens.primary,
    fontFamily: 'Inter_900Black',
    fontSize: 16,
    letterSpacing: -0.2,
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
  sectionLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: space.lg,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calcIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: aurora.cyanSoft,
    borderWidth: 1,
    borderColor: `${aurora.cyan}55`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calcTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  calcText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
});

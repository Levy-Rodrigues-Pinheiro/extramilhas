import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useDashboardStats, useExportCsv } from '../src/hooks/useDashboard';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
  AnimatedNumber,
  StaggerItem,
  SkeletonCard,
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

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useDashboardStats();
  const exportCsv = useExportCsv();

  const handleExport = async () => {
    try {
      haptics.medium();
      const result = await exportCsv.mutateAsync();
      haptics.success();
      await Share.share({
        title: result.filename,
        message: result.csv,
      });
    } catch {
      haptics.error();
      Alert.alert(t('common.error'), t('errors.generic'));
    }
  };

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title}>{t('dashboard.title')}</Text>
            <Text style={styles.subtitle}>Seu progresso em milhas</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={{ padding: space.md, gap: 14 }}>
            <SkeletonCard />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <SkeletonCard />
              </View>
              <View style={{ flex: 1 }}>
                <SkeletonCard />
              </View>
            </View>
          </View>
        ) : isError ? (
          <View style={{ padding: space.md }}>
            <GlassCard glow="danger" radiusSize="lg" padding={20} style={styles.errorBox}>
              <Ionicons name="alert-circle" size={30} color={semantic.danger} />
              <Text style={styles.errorText}>{t('errors.generic')}</Text>
              <AuroraButton
                label={t('common.try_again')}
                onPress={() => refetch()}
                variant="apple"
                size="md"
                icon="refresh"
              />
            </GlassCard>
          </View>
        ) : data ? (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero: economia total */}
            <Animated.View
              entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
            >
              <View style={styles.hero}>
                <LinearGradient
                  colors={gradients.success}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.5)']}
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

                <View style={styles.heroContent}>
                  <View style={styles.heroIconWrap}>
                    <Ionicons name="trending-up" size={20} color="#FFF" />
                  </View>
                  <Text style={styles.heroLabel}>{t('dashboard.savings_total')}</Text>
                  <AnimatedNumber
                    value={data.savingsTotal}
                    format="currency"
                    style={styles.heroValue}
                  />
                  <Text style={styles.heroNote}>{data.savingsEstimateNote}</Text>
                </View>
              </View>
            </Animated.View>

            {/* Stats grid */}
            <View style={styles.grid}>
              <StaggerItem index={0} baseDelay={100}>
                <StatCard
                  icon="notifications"
                  label={t('dashboard.alerts_count')}
                  value={data.notifications.total}
                  sub={`${data.notifications.lastMonth} este mês`}
                  color={aurora.cyan}
                />
              </StaggerItem>
              <StaggerItem index={1} baseDelay={100}>
                <StatCard
                  icon="alarm"
                  label={t('alerts_screen.title')}
                  value={data.alertsConfigured}
                  sub={data.alertsConfigured > 0 ? 'ativos' : 'nenhum'}
                  color={aurora.magenta}
                />
              </StaggerItem>
              <StaggerItem index={2} baseDelay={100}>
                <StatCard
                  icon="trophy"
                  label={t('missions.title')}
                  value={data.missionsCompleted}
                  sub="completas"
                  color={premium.goldLight}
                />
              </StaggerItem>
              <StaggerItem index={3} baseDelay={100}>
                <StatCard
                  icon="wallet"
                  label={t('wallet.total_miles')}
                  value={data.walletTotalMiles}
                  sub={`${data.walletPrograms} programa${data.walletPrograms !== 1 ? 's' : ''}`}
                  color={semantic.success}
                  large
                />
              </StaggerItem>
            </View>

            {/* Export */}
            <Animated.View
              entering={FadeInDown.delay(400).duration(motion.timing.medium)}
              style={{ marginTop: space.md }}
            >
              <GlassCard radiusSize="lg" padding={18} glow="cyan" style={styles.exportBox}>
                <View style={styles.exportHeader}>
                  <View style={styles.exportIconWrap}>
                    <Ionicons name="cloud-download" size={18} color={aurora.cyan} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exportTitle}>{t('profile.export_data')}</Text>
                    <Text style={styles.exportText}>
                      CSV com carteira, alertas, família e notificações (LGPD-ready).
                    </Text>
                  </View>
                </View>

                <View style={{ height: 12 }} />

                <AuroraButton
                  label={t('dashboard.export_csv')}
                  onPress={handleExport}
                  loading={exportCsv.isPending}
                  variant="apple"
                  size="md"
                  icon="download"
                  iconPosition="left"
                  fullWidth
                  haptic="medium"
                />
              </GlassCard>
            </Animated.View>

            <Text style={styles.footer}>
              Gerado em {new Date(data.generatedAt).toLocaleString('pt-BR')}
            </Text>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── StatCard ──────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  large,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  sub?: string;
  color: string;
  large?: boolean;
}) {
  return (
    <GlassCard
      radiusSize="lg"
      padding={14}
      style={[cardStyles.card, large && { flexBasis: '100%' }]}
      accessibilityLabel={`${label}: ${value}${sub ? `. ${sub}` : ''}`}
    >
      <View style={[cardStyles.iconWrap, { backgroundColor: `${color}1F`, borderColor: `${color}55` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <AnimatedNumber
        value={value}
        format="integer"
        style={[cardStyles.value, { color }]}
      />
      <Text style={cardStyles.label}>{label}</Text>
      {sub ? <Text style={cardStyles.sub}>{sub}</Text> : null}
    </GlassCard>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  card: {
    flexBasis: '48%',
    flexGrow: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 4,
  },
  value: {
    fontFamily: 'Inter_900Black',
    fontSize: 28,
    letterSpacing: -0.6,
  },
  label: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: -0.1,
    marginTop: 2,
  },
  sub: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
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

  errorBox: {
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: textTokens.primary,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    textAlign: 'center',
  },

  hero: {
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 160,
    shadowColor: semantic.success,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 14,
  },
  heroContent: {
    padding: space.xl,
    zIndex: 1,
  },
  heroIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroValue: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.4,
    marginTop: 6,
  },
  heroNote: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: space.md,
  },

  exportBox: {
    gap: 4,
  },
  exportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  exportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: aurora.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${aurora.cyan}44`,
  },
  exportTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  exportText: {
    color: textTokens.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },

  footer: {
    color: textTokens.dim,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    textAlign: 'center',
    marginTop: space.xl,
  },
});
